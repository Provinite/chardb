import { readFileSync } from "node:fs";
import * as path from "node:path";
import * as bcrypt from "bcrypt";
import { TestApp, AUTH_QUERIES } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { DatabaseService } from "../database/database.service";
import { refreshCookieName } from "../auth/refresh-cookie";
import { HalloweenClock } from "../halloween/clock";
import { AchievementsModule } from "./achievements.module";
import { AchievementsService } from "./achievements.service";

const COOKIE = refreshCookieName();
const GUILD_ID = "100000000000000001";
const SLUG = "trick-or-treater-2026";
const START = new Date("2026-10-01T11:00:00Z");
const END = new Date("2026-11-08T05:00:00Z");
const DURING = new Date("2026-10-15T12:00:00Z");
const AFTER = new Date("2026-11-20T12:00:00Z");

const BACKFILL_SQL = readFileSync(
  path.resolve(
    __dirname,
    "../../../../packages/database/prisma/migrations/20261102120100_trick_or_treater_2026_backfill/migration.sql",
  ),
  "utf8",
);

const ACHIEVEMENTS_QUERY = `
  query UserAchievements($username: String!) {
    user(username: $username) {
      achievements {
        slug
        name
        description
        imagePath
        earnedAt
        community { id name }
      }
    }
  }
`;

describe("Achievements (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let now: Date;
  let communityId: string;
  let roleId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup(
      {
        imports: [DatabaseModule, AuthModule, UsersModule, AchievementsModule],
      },
      (builder) =>
        builder.overrideProvider(HalloweenClock).useValue({ now: () => now }),
    );
    db = testApp.getDb();
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    jest.restoreAllMocks();
    now = DURING;
    const community = await testApp.createTestCommunity();
    communityId = community.id;
    await db.community.update({
      where: { id: communityId },
      data: { discordGuildId: GUILD_ID, halloweenEnabled: true },
    });
    roleId = (await testApp.createTestRole(communityId)).id;
    await db.halloweenGuildSettings.create({
      data: {
        guildId: GUILD_ID,
        startDate: START,
        endDate: END,
        resetTime: 6,
        knocksPerDay: 5,
        winRate: 0.5,
      },
    });
  });

  let seq = 0;
  const user = async (name: string) => {
    const stamp = `${++seq}_${Math.random().toString(36).slice(2, 8)}`;
    return testApp.createTestUser({
      username: `${name}_${stamp}`.slice(0, 30),
      email: `${name}_${stamp}@example.com`,
      passwordHash: await bcrypt.hash("password123", 4),
    });
  };
  const member = async (name: string) => {
    const u = await user(name);
    await testApp.createTestCommunityMember(u.id, roleId);
    return u;
  };

  const login = (email: string) =>
    testApp.graphqlRequest(AUTH_QUERIES.LOGIN, {
      input: { email, password: "password123" },
    });

  const earned = (userId: string) =>
    db.userAchievement.findMany({ where: { userId } });

  describe("signing in", () => {
    it("earns trick-or-treater 2026 for a member during the event", async () => {
      const alice = await member("alice");
      const res = await login(alice.email);
      expect(res.body.errors).toBeUndefined();

      const rows = await earned(alice.id);
      expect(rows).toEqual([
        expect.objectContaining({ communityId, slug: SLUG, earnedAt: DURING }),
      ]);
    });

    it("earns it when a session refreshes", async () => {
      const alice = await member("alice");
      now = AFTER;
      const res = await login(alice.email);
      const raw = res.headers["set-cookie"];
      const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
      const cookie = cookies.find((c) => c.startsWith(`${COOKIE}=`));
      if (!cookie) throw new Error("login did not set a refresh cookie");
      expect(await earned(alice.id)).toEqual([]);

      now = DURING;
      const refreshed = await testApp.graphqlRequest(
        "mutation { refreshToken }",
        {},
        { Cookie: cookie.split(";")[0] },
      );
      expect(refreshed.body.errors).toBeUndefined();
      expect(await earned(alice.id)).toHaveLength(1);
    });

    it("earns it once however often they sign in", async () => {
      const alice = await member("alice");
      await login(alice.email);
      now = new Date("2026-10-20T12:00:00Z");
      await login(alice.email);

      const rows = await earned(alice.id);
      expect(rows).toHaveLength(1);
      expect(rows[0].earnedAt).toEqual(DURING);
    });

    it("earns nothing for someone who is not a member", async () => {
      const bob = await user("bob");
      await login(bob.email);
      expect(await earned(bob.id)).toEqual([]);
    });

    it("earns nothing outside the event", async () => {
      const alice = await member("alice");
      now = AFTER;
      await login(alice.email);
      expect(await earned(alice.id)).toEqual([]);
    });

    it("earns nothing in a community with Halloween turned off", async () => {
      await db.community.update({
        where: { id: communityId },
        data: { halloweenEnabled: false },
      });
      const alice = await member("alice");
      await login(alice.email);
      expect(await earned(alice.id)).toEqual([]);
    });

    it("still signs in when awarding fails", async () => {
      const alice = await member("alice");
      jest
        .spyOn(testApp.getModuleRef().get(AchievementsService), "recordSignIn")
        .mockRejectedValue(new Error("database down"));

      const res = await login(alice.email);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.login.accessToken).toEqual(expect.any(String));
    });
  });

  describe("User.achievements", () => {
    it("lists what a user earned, by name, to anyone", async () => {
      const alice = await member("alice");
      await login(alice.email);

      const res = await testApp.graphqlRequest(ACHIEVEMENTS_QUERY, {
        username: alice.username,
      });
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.user.achievements).toEqual([
        {
          slug: SLUG,
          name: "Trick-or-Treater 2026",
          description: "Signed in during Trick-or-Treat 2026.",
          imagePath: "/halloween/candy/big-candy-corn.png",
          earnedAt: DURING.toISOString(),
          community: { id: communityId, name: expect.any(String) },
        },
      ]);
    });

    it("leaves out a slug the catalog no longer has", async () => {
      const alice = await member("alice");
      await db.userAchievement.create({
        data: { userId: alice.id, communityId, slug: "retired" },
      });

      const res = await testApp.graphqlRequest(ACHIEVEMENTS_QUERY, {
        username: alice.username,
      });
      expect(res.body.data.user.achievements).toEqual([]);
    });
  });

  describe("backfill migration", () => {
    const backfill = () => db.$executeRawUnsafe(BACKFILL_SQL);
    const IN_WINDOW = new Date("2026-10-05T12:00:00Z");
    const LATER_IN_WINDOW = new Date("2026-10-06T12:00:00Z");
    const BEFORE_WINDOW = new Date("2026-09-20T12:00:00Z");

    it("credits a member who placed a candy offer during the event", async () => {
      const alice = await member("alice");
      await db.halloweenCandyOffer.create({
        data: { guildId: GUILD_ID, ownerId: alice.id, createdAt: IN_WINDOW },
      });
      await backfill();
      expect(await earned(alice.id)).toEqual([
        expect.objectContaining({
          communityId,
          slug: SLUG,
          earnedAt: IN_WINDOW,
        }),
      ]);
    });

    it("credits a member who started a candy trade during the event", async () => {
      const alice = await member("alice");
      await db.halloweenCandyTrade.create({
        data: {
          guildId: GUILD_ID,
          initiatorId: alice.id,
          createdAt: IN_WINDOW,
        },
      });
      await backfill();
      expect(await earned(alice.id)).toHaveLength(1);
    });

    it("credits a member who edited a candy board during the event, from the earliest activity", async () => {
      const alice = await member("alice");
      const board = await db.halloweenCandyBoard.create({
        data: { guildId: GUILD_ID, ownerId: alice.id },
      });
      await db.$executeRaw`UPDATE halloween_candy_boards SET created_at = ${BEFORE_WINDOW}, updated_at = ${LATER_IN_WINDOW} WHERE id = ${board.id}::uuid`;
      await db.halloweenCandyOffer.create({
        data: { guildId: GUILD_ID, ownerId: alice.id, createdAt: IN_WINDOW },
      });
      await backfill();
      expect(await earned(alice.id)).toEqual([
        expect.objectContaining({ earnedAt: IN_WINDOW }),
      ]);
    });

    it("skips activity outside the event", async () => {
      const alice = await member("alice");
      await db.halloweenCandyOffer.create({
        data: {
          guildId: GUILD_ID,
          ownerId: alice.id,
          createdAt: BEFORE_WINDOW,
        },
      });
      await backfill();
      expect(await earned(alice.id)).toEqual([]);
    });

    it("skips someone who is not a member", async () => {
      const bob = await user("bob");
      await db.halloweenCandyOffer.create({
        data: { guildId: GUILD_ID, ownerId: bob.id, createdAt: IN_WINDOW },
      });
      await backfill();
      expect(await earned(bob.id)).toEqual([]);
    });

    it("skips an event that did not start in 2026", async () => {
      await db.halloweenGuildSettings.update({
        where: { guildId: GUILD_ID },
        data: {
          startDate: new Date("2025-10-01T11:00:00Z"),
          endDate: new Date("2025-11-08T05:00:00Z"),
        },
      });
      const alice = await member("alice");
      await db.halloweenCandyOffer.create({
        data: {
          guildId: GUILD_ID,
          ownerId: alice.id,
          createdAt: new Date("2025-10-05T12:00:00Z"),
        },
      });
      await backfill();
      expect(await earned(alice.id)).toEqual([]);
    });

    it("skips a community with Halloween turned off", async () => {
      await db.community.update({
        where: { id: communityId },
        data: { halloweenEnabled: false },
      });
      const alice = await member("alice");
      await db.halloweenCandyOffer.create({
        data: { guildId: GUILD_ID, ownerId: alice.id, createdAt: IN_WINDOW },
      });
      await backfill();
      expect(await earned(alice.id)).toEqual([]);
    });

    it("leaves an achievement already earned as it was", async () => {
      const alice = await member("alice");
      await db.userAchievement.create({
        data: { userId: alice.id, communityId, slug: SLUG, earnedAt: DURING },
      });
      await db.halloweenCandyOffer.create({
        data: { guildId: GUILD_ID, ownerId: alice.id, createdAt: IN_WINDOW },
      });
      await backfill();
      expect(await earned(alice.id)).toEqual([
        expect.objectContaining({ earnedAt: DURING }),
      ]);
    });
  });
});
