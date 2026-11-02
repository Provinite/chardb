import { readFileSync } from "node:fs";
import * as path from "node:path";
import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { DatabaseService } from "../database/database.service";
import { HalloweenModule } from "../halloween/halloween.module";
import { HalloweenDiscordClient } from "../halloween/discord/halloween-discord.client";
import { CandySwapService } from "../halloween/swap/candy-swap.service";
import { mockDiscord } from "../halloween/testing/command-harness";
import { GUILD_ID } from "../halloween/testing/fixtures";
import { AchievementsModule } from "./achievements.module";

const SLUG = "infectious-enthusiasm-2026";
const START = new Date("2026-10-01T11:00:00Z");

const SEED_SQL = readFileSync(
  path.resolve(
    __dirname,
    "../../../../packages/database/prisma/migrations/20261102160000_infectious_enthusiasm_seed/migration.sql",
  ),
  "utf8",
);

/**
 * Infectious Enthusiasm passes from whoever has it to whoever they swap
 * candy with. Staff and site admins start with it.
 */
describe("Infectious Enthusiasm (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let swap: CandySwapService;
  let communityId: string;
  let memberRole: string;
  let knockSeq = 0;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup(
      {
        imports: [
          DatabaseModule,
          AuthModule,
          HalloweenModule,
          AchievementsModule,
        ],
      },
      (builder) =>
        builder
          .overrideProvider(HalloweenDiscordClient)
          .useValue(mockDiscord()),
    );
    db = testApp.getDb();
    swap = testApp.getModuleRef().get(CandySwapService);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    const community = await testApp.createTestCommunity();
    communityId = community.id;
    await db.community.update({
      where: { id: communityId },
      data: { discordGuildId: GUILD_ID, halloweenEnabled: true },
    });
    memberRole = (await testApp.createTestRole(communityId)).id;
    await db.halloweenGuildSettings.create({
      data: {
        guildId: GUILD_ID,
        startDate: START,
        resetTime: 6,
        knocksPerDay: 3,
        winRate: 0,
      },
    });
  });

  let seq = 0;
  const user = async (name: string, extra: { isAdmin?: boolean } = {}) => {
    const stamp = `${++seq}_${Math.random().toString(36).slice(2, 8)}`;
    const u = await testApp.createTestUser({
      username: `${name}_${stamp}`.slice(0, 30),
      email: `${name}_${stamp}@example.com`,
    });
    if (extra.isAdmin) {
      await db.user.update({ where: { id: u.id }, data: { isAdmin: true } });
    }
    return u;
  };
  const member = async (name: string, roleId = memberRole) => {
    const u = await user(name);
    await testApp.createTestCommunityMember(u.id, roleId);
    return u;
  };

  const infected = async () =>
    (
      await db.userAchievement.findMany({
        where: { communityId, slug: SLUG },
        select: { userId: true, earnedAt: true },
      })
    ).reduce(
      (all, a) => all.set(a.userId, a.earnedAt),
      new Map<string, Date>(),
    );

  const carrier = (userId: string, earnedAt = START) =>
    db.userAchievement.create({
      data: { userId, communityId, slug: SLUG, earnedAt },
    });

  const candy = async (ownerId: string, slug: string) => {
    const knock = await db.halloweenKnockEvent.create({
      data: {
        guildId: GUILD_ID,
        userId: `2200000000000${String(++knockSeq).padStart(5, "0")}`,
        candySlug: slug,
      },
    });
    return db.halloweenCandy.create({
      data: {
        guildId: GUILD_ID,
        slug,
        knockEventId: knock.id,
        discordUserId: knock.userId,
        ownerId,
      },
    });
  };

  /** `taker` accepts `offerer`'s one-for-one offer. */
  const swapCandy = async (takerId: string, offererId: string) => {
    const give = await candy(offererId, "candy-corn");
    const pay = await candy(takerId, "gummy-bears");
    const { offer } = await swap.place(communityId, offererId, [give.id], null);
    await swap.accept(communityId, takerId, offer.id, pay.slug);
  };

  describe("on a swap", () => {
    it("passes from the offerer to whoever takes their offer", async () => {
      const mod = await member("mod");
      const alice = await member("alice");
      await carrier(mod.id);
      await swapCandy(alice.id, mod.id);
      expect([...(await infected()).keys()].sort()).toEqual(
        [mod.id, alice.id].sort(),
      );
    });

    it("passes from the taker to the offerer", async () => {
      const mod = await member("mod");
      const alice = await member("alice");
      await carrier(mod.id);
      await swapCandy(mod.id, alice.id);
      expect((await infected()).has(alice.id)).toBe(true);
    });

    it("keeps when the carrier caught it first", async () => {
      const mod = await member("mod");
      const alice = await member("alice");
      await carrier(mod.id);
      await swapCandy(alice.id, mod.id);
      await swapCandy(alice.id, mod.id);
      expect((await infected()).get(mod.id)).toEqual(START);
    });

    it("does not pass between two players without it", async () => {
      const alice = await member("alice");
      const bob = await member("bob");
      await swapCandy(alice.id, bob.id);
      expect((await infected()).size).toBe(0);
    });

    it("does not pass to a player who is not a member", async () => {
      const mod = await member("mod");
      const stranger = await user("stranger");
      await carrier(mod.id);
      await swapCandy(stranger.id, mod.id);
      expect((await infected()).has(stranger.id)).toBe(false);
    });
  });

  describe("seed migration", () => {
    const seed = () => db.$executeRawUnsafe(SEED_SQL);
    const tradeAt = (iso: string, initiatorId: string, offererId: string) =>
      db.halloweenCandyTrade.create({
        data: {
          guildId: GUILD_ID,
          initiatorId,
          offererId,
          createdAt: new Date(iso),
        },
      });

    it("seeds staff and site admins, dated from the event's start", async () => {
      const granter = await member(
        "granter",
        (await testApp.createTestRole(communityId, { canGrantItems: true })).id,
      );
      const manager = await member(
        "manager",
        (await testApp.createTestRole(communityId, { canManageItems: true }))
          .id,
      );
      const admin = await user("admin", { isAdmin: true });
      await testApp.createTestCommunityMember(admin.id, memberRole);
      await user("outside_admin", { isAdmin: true });
      await member("alice");

      await seed();
      const seeded = await infected();
      expect([...seeded.keys()].sort()).toEqual(
        [granter.id, manager.id, admin.id].sort(),
      );
      expect([...seeded.values()]).toEqual([START, START, START]);
    });

    it("replays swaps in order, so it spreads along a chain", async () => {
      const mod = await member(
        "mod",
        (await testApp.createTestRole(communityId, { canGrantItems: true })).id,
      );
      const alice = await member("alice");
      const bob = await member("bob");
      const carol = await member("carol");
      // Carol swaps with Bob before Bob has it: she does not catch it.
      await tradeAt("2026-10-02T12:00:00Z", carol.id, bob.id);
      await tradeAt("2026-10-03T12:00:00Z", alice.id, mod.id);
      await tradeAt("2026-10-04T12:00:00Z", bob.id, alice.id);

      await seed();
      const after = await infected();
      expect(after.get(alice.id)).toEqual(new Date("2026-10-03T12:00:00Z"));
      expect(after.get(bob.id)).toEqual(new Date("2026-10-04T12:00:00Z"));
      expect(after.has(carol.id)).toBe(false);
    });

    it("ignores swaps from before the event and communities with it off", async () => {
      const mod = await member(
        "mod",
        (await testApp.createTestRole(communityId, { canGrantItems: true })).id,
      );
      const alice = await member("alice");
      await tradeAt("2026-09-20T12:00:00Z", alice.id, mod.id);
      await seed();
      expect((await infected()).has(alice.id)).toBe(false);

      await testApp.clearDatabase();
      const off = await testApp.createTestCommunity();
      await db.community.update({
        where: { id: off.id },
        data: { discordGuildId: GUILD_ID, halloweenEnabled: false },
      });
      await db.halloweenGuildSettings.create({
        data: {
          guildId: GUILD_ID,
          startDate: START,
          resetTime: 6,
          knocksPerDay: 3,
          winRate: 0,
        },
      });
      const staffRole = await testApp.createTestRole(off.id, {
        canGrantItems: true,
      });
      const offMod = await user("offmod");
      await testApp.createTestCommunityMember(offMod.id, staffRole.id);
      await seed();
      expect(await db.userAchievement.count()).toBe(0);
    });

    it("can run twice", async () => {
      await member(
        "mod",
        (await testApp.createTestRole(communityId, { canGrantItems: true })).id,
      );
      await seed();
      await seed();
      expect((await infected()).size).toBe(1);
    });
  });
});
