import { readFileSync } from "node:fs";
import * as path from "node:path";
import {
  ApplicationCommandOptionType,
  type APIApplicationCommandGuildInteraction,
  type APIApplicationCommandInteractionDataOption,
} from "@discordjs/core";
import { ExternalAccountProvider } from "@chardb/database";
import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { DatabaseService } from "../database/database.service";
import { DiscordService } from "../discord/discord.service";
import { HalloweenModule } from "../halloween/halloween.module";
import { HalloweenCommandDispatcher } from "../halloween/discord/halloween-command.dispatcher";
import { HalloweenDiscordClient } from "../halloween/discord/halloween-discord.client";
import { HalloweenRandom } from "../halloween/random";
import { HalloweenConfig } from "../halloween/halloween.config";
import { DoorKnockService } from "../halloween/door-knock/door-knock.service";
import { GuildSettingsService } from "../halloween/services/guild-settings.service";
import { CandySwapService } from "../halloween/swap/candy-swap.service";
import { mockDiscord } from "../halloween/testing/command-harness";
import {
  GUILD_ID,
  OTHER_USER_ID,
  USER_ID,
  buildInteraction,
} from "../halloween/testing/fixtures";
import { DomainEvents } from "../events/domain-events";
import { AchievementsModule } from "./achievements.module";
import { AchievementsService } from "./achievements.service";

const COUNT_BACKFILL_SQL = readFileSync(
  path.resolve(
    __dirname,
    "../../../../packages/database/prisma/migrations/20261102150100_halloween_candy_offer_count_backfill/migration.sql",
  ),
  "utf8",
);

/**
 * What playing Trick-or-Treat earns, from the command or mutation down to
 * the achievement row: the Halloween code publishes, achievements listen.
 */
describe("Halloween play achievements (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let dispatcher: HalloweenCommandDispatcher;
  let swap: CandySwapService;
  let events: DomainEvents;
  let achievements: AchievementsService;
  let random: HalloweenRandom;
  let doorKnocks: DoorKnockService;
  let botUserId: string;
  let communityId: string;
  let roleId: string;
  let interactionId = 0;
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
          .useValue(mockDiscord())
          .overrideProvider(DiscordService)
          .useValue({ validateUserId: () => Promise.resolve(true) }),
    );
    db = testApp.getDb();
    const refs = testApp.getModuleRef();
    dispatcher = refs.get(HalloweenCommandDispatcher);
    swap = refs.get(CandySwapService);
    events = refs.get(DomainEvents);
    achievements = refs.get(AchievementsService);
    random = refs.get(HalloweenRandom);
    doorKnocks = refs.get(DoorKnockService);
    botUserId = refs.get(HalloweenConfig).applicationId;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    testApp.getModuleRef().get(GuildSettingsService).invalidate(GUILD_ID);
    jest.restoreAllMocks();
    const community = await testApp.createTestCommunity();
    communityId = community.id;
    await db.community.update({
      where: { id: communityId },
      data: { discordGuildId: GUILD_ID, halloweenEnabled: true },
    });
    roleId = (await testApp.createTestRole(communityId)).id;
  });

  /** An event, with a prize in stock so knocks are not refused for want of one. */
  const setUpEvent = async ({
    startDate = new Date("2026-10-01T11:00:00Z"),
    endDate = null as Date | null,
    knocksPerDay = 3,
  } = {}) => {
    await db.halloweenGuildSettings.create({
      data: {
        guildId: GUILD_ID,
        startDate,
        endDate,
        resetTime: 6,
        knocksPerDay,
        winRate: 0,
      },
    });
    await db.halloweenPrize.create({
      data: {
        guildId: GUILD_ID,
        id: "prize",
        name: "Prize",
        initialStock: 1,
        currentStock: 1,
        weight: 1,
        image: "https://i.test/prize.png",
      },
    });
  };

  let seq = 0;
  const member = async (name: string, discordUserId?: string) => {
    const stamp = `${++seq}_${Math.random().toString(36).slice(2, 8)}`;
    const user = await testApp.createTestUser({
      username: `${name}_${stamp}`.slice(0, 30),
      email: `${name}_${stamp}@example.com`,
    });
    await testApp.createTestCommunityMember(user.id, roleId);
    if (discordUserId) {
      await db.externalAccount.create({
        data: {
          userId: user.id,
          provider: ExternalAccountProvider.DISCORD,
          providerAccountId: discordUserId,
          displayName: name,
        },
      });
    }
    return user;
  };

  /** What the user has earned once every listener has finished. */
  const earned = async (userId: string) => {
    await events.idle();
    return (
      await db.userAchievement.findMany({
        where: { userId, communityId },
        select: { slug: true },
        orderBy: { slug: "asc" },
      })
    ).map((a) => a.slug);
  };

  const candy = async (ownerId: string, slug: string) => {
    const knock = await db.halloweenKnockEvent.create({
      data: {
        guildId: GUILD_ID,
        userId: `2100000000000${String(++knockSeq).padStart(5, "0")}`,
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

  const run = async (
    name: string,
    options?: APIApplicationCommandInteractionDataOption[],
    userId = USER_ID,
  ) => {
    const { reply, afterReply } = await dispatcher.dispatch(
      buildInteraction({
        id: `${++interactionId}`,
        name,
        options,
        userId,
      }) as APIApplicationCommandGuildInteraction,
    );
    await afterReply();
    return reply;
  };

  const giftyTo = (to: string, from = USER_ID) =>
    run(
      "gifty",
      [{ type: ApplicationCommandOptionType.User, name: "user", value: to }],
      from,
    );

  /** A one-for-one trade between two members, `a` taking `b`'s offer. */
  const trade = async (aId: string, bId: string) => {
    const give = await candy(bId, "candy-corn");
    const pay = await candy(aId, "gummy-bears");
    const { offer } = await swap.place(communityId, bId, [give.id], null);
    await swap.accept(communityId, aId, offer.id, pay.slug);
  };

  describe("candy swap", () => {
    beforeEach(() => setUpEvent());

    it("earns each trade tier on both sides of the trade that reaches it", async () => {
      const alice = await member("alice");
      const bob = await member("bob");
      for (let i = 0; i < 4; i++) await trade(alice.id, bob.id);
      expect(await earned(alice.id)).toEqual([]);

      await trade(alice.id, bob.id);
      expect(await earned(alice.id)).toEqual(["candy-trades-5-2026"]);
      expect(await earned(bob.id)).toEqual(["candy-trades-5-2026"]);
    });

    it("earns generous offer for offering 3 for 1, and bargain hunter for taking it", async () => {
      const alice = await member("alice");
      const bob = await member("bob");
      const offered = await Promise.all([
        candy(bob.id, "candy-corn"),
        candy(bob.id, "jelly-beans"),
        candy(bob.id, "pb-cup"),
      ]);
      await candy(alice.id, "gummy-bears");

      const { offer } = await swap.place(
        communityId,
        bob.id,
        offered.map((c) => c.id),
        "gummy-bears",
      );
      expect(await earned(bob.id)).toEqual(["generous-offer-2026"]);

      await swap.accept(communityId, alice.id, offer.id, null);
      expect(await earned(alice.id)).toEqual(["bargain-hunter-2026"]);
      expect(await earned(bob.id)).toEqual(["generous-offer-2026"]);
    });

    it("earns nothing for offering 2 for 1", async () => {
      const bob = await member("bob");
      const offered = await Promise.all([
        candy(bob.id, "candy-corn"),
        candy(bob.id, "jelly-beans"),
      ]);
      await swap.place(
        communityId,
        bob.id,
        offered.map((c) => c.id),
        null,
      );
      expect(await earned(bob.id)).toEqual([]);
    });

    it("earns nothing for a user who is not a member", async () => {
      const bob = await member("bob");
      await db.communityMember.deleteMany({ where: { userId: bob.id } });
      const offered = await Promise.all([
        candy(bob.id, "candy-corn"),
        candy(bob.id, "jelly-beans"),
        candy(bob.id, "pb-cup"),
      ]);
      await swap.place(
        communityId,
        bob.id,
        offered.map((c) => c.id),
        null,
      );
      expect(await earned(bob.id)).toEqual([]);
    });
  });

  describe("gifties and knocks", () => {
    it("earns treat yourself for a gifty to yourself", async () => {
      await setUpEvent();
      const alice = await member("alice", USER_ID);
      await giftyTo(OTHER_USER_ID);
      expect(await earned(alice.id)).toEqual([]);

      await db.halloweenGifty.deleteMany();
      await giftyTo(USER_ID);
      expect(await earned(alice.id)).toEqual(["treat-yourself-2026"]);
    });

    it("earns faustian bargain for a gifty to the bot", async () => {
      await setUpEvent();
      const alice = await member("alice", USER_ID);
      await giftyTo(OTHER_USER_ID);
      expect(await earned(alice.id)).toEqual([]);

      await db.halloweenGifty.deleteMany();
      await giftyTo(botUserId);
      expect(await earned(alice.id)).toEqual(["faustian-bargain-2026"]);
    });

    describe("no relation", () => {
      const named = async (name: string, displayName: string | null) => {
        const user = await member(name);
        await db.user.update({ where: { id: user.id }, data: { displayName } });
        return user;
      };

      it("is earned by knocking on the door of anyone named Luther", async () => {
        await setUpEvent();
        const alice = await member("alice");
        const bob = await named("bob", "Luther the Great");
        const luther = await named("lu", " lUTHER ");

        await doorKnocks.knock(communityId, alice.id, bob.id);
        expect(await earned(alice.id)).toEqual([]);

        await doorKnocks.knock(communityId, alice.id, luther.id);
        expect(await earned(alice.id)).toEqual(["no-relation-2026"]);
        expect(await earned(luther.id)).toEqual([]);
      });

      it("earns also no relation for knocking on the door of anyone named Daphne", async () => {
        await setUpEvent();
        const alice = await member("alice");
        const daphne = await named("daph", "Daphne");

        await doorKnocks.knock(communityId, alice.id, daphne.id);
        expect(await earned(alice.id)).toEqual(["also-no-relation-2026"]);
      });

      it("publishes a door knock", async () => {
        await setUpEvent();
        const alice = await member("alice");
        const bob = await named("bob", null);
        const publish = jest.spyOn(events, "publish");
        await doorKnocks.knock(communityId, alice.id, bob.id);
        expect(publish).toHaveBeenCalledWith("halloween.door.knocked", {
          guildId: GUILD_ID,
          knockerId: alice.id,
          knockeeId: bob.id,
        });
      });
    });

    it("earns nobody home for knocking with no knocks left, and records the attempt", async () => {
      await setUpEvent({ knocksPerDay: 1 });
      jest.spyOn(random, "unit").mockReturnValue(0.999);
      const alice = await member("alice", USER_ID);

      await run("knock");
      expect(await earned(alice.id)).toEqual([]);
      await run("knock");

      expect(await earned(alice.id)).toEqual(["nobody-home-2026"]);
      expect(
        await db.halloweenOutOfKnocksAttempt.count({
          where: { guildId: GUILD_ID, discordUserId: USER_ID },
        }),
      ).toBe(1);
    });

    it("records the attempt of a player with no account linked, who earns it on signing in", async () => {
      await setUpEvent({ knocksPerDay: 1 });
      jest.spyOn(random, "unit").mockReturnValue(0.999);
      await run("knock");
      await run("knock");
      await events.idle();
      expect(await db.userAchievement.count()).toBe(0);

      const alice = await member("alice", USER_ID);
      await achievements.recordSignIn(alice.id);
      expect(await earned(alice.id)).toContain("nobody-home-2026");
    });

    it("publishes a knock that went through", async () => {
      await setUpEvent();
      jest.spyOn(random, "unit").mockReturnValue(0.999);
      const publish = jest.spyOn(events, "publish");
      await run("knock");
      expect(publish).toHaveBeenCalledWith("halloween.knock.completed", {
        guildId: GUILD_ID,
        discordUserId: USER_ID,
      });
    });

    describe("every night", () => {
      // Reset days of the 10th, 11th and 12th, at 6 AM Chicago (11:00Z).
      const startDate = new Date("2026-10-10T11:00:00Z");
      const endDate = new Date("2026-10-13T11:00:00Z");
      const knockAt = (iso: string) =>
        db.halloweenKnockEvent.create({
          data: { guildId: GUILD_ID, userId: USER_ID, time: new Date(iso) },
        });
      const knocked = () =>
        events.publish("halloween.knock.completed", {
          guildId: GUILD_ID,
          discordUserId: USER_ID,
        });

      beforeEach(() => setUpEvent({ startDate, endDate }));

      it("is earned by a knock on every day of the event", async () => {
        const alice = await member("alice", USER_ID);
        await knockAt("2026-10-10T15:00:00Z");
        await knockAt("2026-10-11T15:00:00Z");
        await knocked();
        expect(await earned(alice.id)).toEqual([]);

        await knockAt("2026-10-12T15:00:00Z");
        await knocked();
        expect(await earned(alice.id)).toEqual(["every-night-2026"]);
      });

      it("is not earned with a day missed", async () => {
        const alice = await member("alice", USER_ID);
        await knockAt("2026-10-10T15:00:00Z");
        await knockAt("2026-10-12T15:00:00Z");
        await knocked();
        expect(await earned(alice.id)).toEqual([]);
      });
    });
  });

  describe("candy count backfill migration", () => {
    /** Its statements one at a time: a prepared statement holds only one. */
    const backfill = async () => {
      for (const statement of COUNT_BACKFILL_SQL.split(";")) {
        if (statement.replace(/--.*$/gm, "").trim()) {
          await db.$executeRawUnsafe(statement);
        }
      }
    };
    const countOf = async (id: string) =>
      (
        await db.halloweenCandyOffer.findUniqueOrThrow({
          where: { id },
          select: { candyCount: true },
        })
      ).candyCount;
    const forget = () =>
      db.halloweenCandyOffer.updateMany({ data: { candyCount: null } });

    beforeEach(() => setUpEvent());

    it("counts an open offer's candies", async () => {
      const bob = await member("bob");
      const offered = await Promise.all([
        candy(bob.id, "candy-corn"),
        candy(bob.id, "jelly-beans"),
      ]);
      const { offer } = await swap.place(
        communityId,
        bob.id,
        offered.map((c) => c.id),
        null,
      );
      await forget();
      await backfill();
      expect(await countOf(offer.id)).toBe(2);
    });

    it("counts a filled offer's candies from the trade's lines", async () => {
      const alice = await member("alice");
      const bob = await member("bob");
      const offered = await Promise.all([
        candy(bob.id, "candy-corn"),
        candy(bob.id, "jelly-beans"),
        candy(bob.id, "pb-cup"),
      ]);
      await candy(alice.id, "gummy-bears");
      const { offer } = await swap.place(
        communityId,
        bob.id,
        offered.map((c) => c.id),
        "gummy-bears",
      );
      await swap.accept(communityId, alice.id, offer.id, null);
      await forget();
      await backfill();
      expect(await countOf(offer.id)).toBe(3);
    });

    it("counts both offers of a match, each from its own side", async () => {
      const alice = await member("alice");
      const bob = await member("bob");
      const bobs = await candy(bob.id, "candy-corn");
      const alices = await candy(alice.id, "gummy-bears");
      const first = await swap.place(communityId, bob.id, [bobs.id], null);
      const second = await swap.place(
        communityId,
        alice.id,
        [alices.id],
        "candy-corn",
      );
      expect(second.trade).not.toBeNull();
      await forget();
      await backfill();
      expect(await countOf(first.offer.id)).toBe(1);
      expect(await countOf(second.offer.id)).toBe(1);
    });

    it("leaves a cancelled offer unknown", async () => {
      const bob = await member("bob");
      const offered = await candy(bob.id, "candy-corn");
      const { offer } = await swap.place(
        communityId,
        bob.id,
        [offered.id],
        null,
      );
      await swap.cancel(communityId, bob.id, offer.id);
      await forget();
      await backfill();
      expect(await countOf(offer.id)).toBeNull();
    });
  });

  describe("signing in", () => {
    it("earns what was played before achievements were listening", async () => {
      await setUpEvent();
      const alice = await member("alice", USER_ID);
      const bob = await member("bob");
      // Played with no listeners: rows only.
      await db.halloweenGifty.create({
        data: { guildId: GUILD_ID, fromUserId: USER_ID, toUserId: USER_ID },
      });
      for (let i = 0; i < 5; i++) {
        await db.halloweenCandyTrade.create({
          data: { guildId: GUILD_ID, initiatorId: alice.id, offererId: bob.id },
        });
      }

      await achievements.recordSignIn(alice.id);
      expect(await earned(alice.id)).toEqual([
        "candy-trades-5-2026",
        "treat-yourself-2026",
        "trick-or-treater-2026",
      ]);
    });

    it("earns what was played after the event ended", async () => {
      await setUpEvent({
        startDate: new Date("2026-10-01T11:00:00Z"),
        endDate: new Date("2026-10-20T11:00:00Z"),
      });
      const alice = await member("alice", USER_ID);
      await db.halloweenGifty.create({
        data: {
          guildId: GUILD_ID,
          fromUserId: USER_ID,
          toUserId: USER_ID,
          time: new Date("2026-10-05T12:00:00Z"),
        },
      });
      await achievements.recordSignIn(alice.id);
      expect(await earned(alice.id)).toEqual(["treat-yourself-2026"]);
    });

    it("counts nothing from outside the event's dates", async () => {
      await setUpEvent({
        startDate: new Date("2026-10-01T11:00:00Z"),
        endDate: new Date("2026-10-20T11:00:00Z"),
      });
      const alice = await member("alice", USER_ID);
      await db.halloweenGifty.create({
        data: {
          guildId: GUILD_ID,
          fromUserId: USER_ID,
          toUserId: USER_ID,
          time: new Date("2026-09-05T12:00:00Z"),
        },
      });
      await achievements.recordSignIn(alice.id);
      expect(await earned(alice.id)).toEqual([]);
    });
  });
});
