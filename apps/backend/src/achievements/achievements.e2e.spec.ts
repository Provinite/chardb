import { readFileSync } from "node:fs";
import * as path from "node:path";
import * as bcrypt from "bcrypt";
import { TestApp, AUTH_QUERIES } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { DatabaseService } from "../database/database.service";
import { refreshCookieName } from "../auth/refresh-cookie";
import { Clock } from "../clock/clock";
import { AchievementsModule } from "./achievements.module";
import {
  AchievementsService,
  SIGN_IN_CHECK_TTL_MS,
} from "./achievements.service";

const COOKIE = refreshCookieName();
const GUILD_ID = "100000000000000001";
const SLUG = "trick-or-treater-2026";
const START = new Date("2026-10-01T11:00:00Z");
const END = new Date("2026-11-08T05:00:00Z");
const DURING = new Date("2026-10-15T12:00:00Z");
const AFTER = new Date("2026-11-20T12:00:00Z");
const BEFORE = new Date("2026-09-20T12:00:00Z");

const later = (date: Date, ms: number) => new Date(date.getTime() + ms);

const BACKFILL_SQL = readFileSync(
  path.resolve(
    __dirname,
    "../../../../packages/database/prisma/migrations/20261102120100_trick_or_treater_2026_backfill/migration.sql",
  ),
  "utf8",
);

const MEMBER_ACHIEVEMENTS = `
  query MemberAchievements($communityId: ID!, $userId: ID!) {
    communityMemberAchievements(communityId: $communityId, userId: $userId) {
      id
      slug
      name
      description
      imagePath
      earnedAt
    }
  }
`;

describe("Achievements (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let achievements: AchievementsService;
  let now: Date;
  let communityId: string;
  let roleId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup(
      {
        imports: [DatabaseModule, AuthModule, UsersModule, AchievementsModule],
      },
      (builder) => builder.overrideProvider(Clock).useValue({ now: () => now }),
    );
    db = testApp.getDb();
    achievements = testApp.getModuleRef().get(AchievementsService);
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
  const member = async (name: string, inRole = roleId) => {
    const u = await user(name);
    await testApp.createTestCommunityMember(u.id, inRole);
    return u;
  };

  /**
   * Signs in and waits for the award, which runs after the response has
   * gone: whatever `recordSignIn` started is awaited before returning.
   */
  const awaitingAwards = async <T>(send: () => Promise<T>): Promise<T> => {
    const spy = jest.spyOn(achievements, "recordSignIn");
    const res = await send();
    await Promise.all(spy.mock.results.map((r) => r.value as Promise<void>));
    spy.mockRestore();
    return res;
  };

  const login = (email: string) =>
    awaitingAwards(() =>
      testApp.graphqlRequest(AUTH_QUERIES.LOGIN, {
        input: { email, password: "password123" },
      }),
    );

  const earned = (userId: string) =>
    db.userAchievement.findMany({ where: { userId } });

  describe("signing in", () => {
    it("earns trick-or-treater 2026 for a member during the event", async () => {
      const alice = await member("alice");
      const res = await login(alice.email);
      expect(res.body.errors).toBeUndefined();

      expect(await earned(alice.id)).toEqual([
        expect.objectContaining({ communityId, slug: SLUG, earnedAt: DURING }),
      ]);
    });

    it("earns it when a session refreshes", async () => {
      const alice = await member("alice");
      now = BEFORE;
      const res = await login(alice.email);
      const raw = res.headers["set-cookie"];
      const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
      const cookie = cookies.find((c) => c.startsWith(`${COOKIE}=`));
      if (!cookie) throw new Error("login did not set a refresh cookie");
      expect(await earned(alice.id)).toEqual([]);

      now = DURING;
      const refreshed = await awaitingAwards(() =>
        testApp.graphqlRequest(
          "mutation { refreshToken }",
          {},
          { Cookie: cookie.split(";")[0] },
        ),
      );
      expect(refreshed.body.errors).toBeUndefined();
      expect(await earned(alice.id)).toHaveLength(1);
    });

    it("earns it once however often they sign in", async () => {
      const alice = await member("alice");
      await login(alice.email);
      now = later(DURING, 2 * SIGN_IN_CHECK_TTL_MS);
      await login(alice.email);

      const rows = await earned(alice.id);
      expect(rows).toHaveLength(1);
      expect(rows[0].earnedAt).toEqual(DURING);
    });

    it("checks a user again only once the last check is an hour old", async () => {
      const alice = await member("alice");
      await login(alice.email);
      await db.userAchievement.deleteMany({ where: { userId: alice.id } });

      now = later(DURING, SIGN_IN_CHECK_TTL_MS - 1);
      await login(alice.email);
      expect(await earned(alice.id)).toEqual([]);

      now = later(DURING, SIGN_IN_CHECK_TTL_MS);
      await login(alice.email);
      expect(await earned(alice.id)).toHaveLength(1);
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
        .spyOn(achievements, "recordSignIn")
        .mockRejectedValue(new Error("database down"));

      const res = await testApp.graphqlRequest(AUTH_QUERIES.LOGIN, {
        input: { email: alice.email, password: "password123" },
      });
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.login.accessToken).toEqual(expect.any(String));
    });

    it("signs in without waiting for the award", async () => {
      const alice = await member("alice");
      jest
        .spyOn(achievements, "recordSignIn")
        .mockReturnValue(new Promise<void>(() => undefined));

      const res = await testApp.graphqlRequest(AUTH_QUERIES.LOGIN, {
        input: { email: alice.email, password: "password123" },
      });
      expect(res.body.data.login.accessToken).toEqual(expect.any(String));
    }, 5_000);
  });

  describe("communityMemberAchievements", () => {
    const ask = (
      asUserId: string | null,
      userId: string,
      community = communityId,
    ) =>
      asUserId
        ? testApp
            .generateTestToken(asUserId)
            .then((token) =>
              testApp.authenticatedGraphqlRequest(
                MEMBER_ACHIEVEMENTS,
                { communityId: community, userId },
                token,
              ),
            )
        : testApp.graphqlRequest(MEMBER_ACHIEVEMENTS, {
            communityId: community,
            userId,
          });

    it("lists what a member earned here, by name, to a fellow member", async () => {
      const alice = await member("alice");
      const bob = await member("bob");
      await login(alice.email);

      const res = await ask(bob.id, alice.id);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.communityMemberAchievements).toEqual([
        {
          id: expect.any(String),
          slug: SLUG,
          name: "Trick-or-Treater 2026",
          description: "Signed in during Trick-or-Treat 2026.",
          imagePath: "/halloween/candy/big-candy-corn.png",
          earnedAt: DURING.toISOString(),
        },
      ]);
    });

    it("leaves out what was earned in another community", async () => {
      const alice = await member("alice");
      const other = await testApp.createTestCommunity("Elsewhere");
      await db.userAchievement.create({
        data: { userId: alice.id, communityId: other.id, slug: SLUG },
      });

      const res = await ask(alice.id, alice.id);
      expect(res.body.data.communityMemberAchievements).toEqual([]);
    });

    it("refuses someone who is not a member", async () => {
      const alice = await member("alice");
      const outsider = await user("outsider");
      await login(alice.email);

      const res = await ask(outsider.id, alice.id);
      expect(res.body.errors).toBeDefined();
      expect(res.body.data?.communityMemberAchievements ?? null).toBeNull();
    });

    it("refuses someone signed out", async () => {
      const alice = await member("alice");
      await login(alice.email);

      const res = await ask(null, alice.id);
      expect(res.body.errors).toBeDefined();
    });

    it("leaves out a slug the catalog no longer has", async () => {
      const alice = await member("alice");
      await db.userAchievement.create({
        data: { userId: alice.id, communityId, slug: "retired" },
      });

      const res = await ask(alice.id, alice.id);
      expect(res.body.data.communityMemberAchievements).toEqual([]);
    });
  });

  describe("backfill migration", () => {
    const backfill = () => db.$executeRawUnsafe(BACKFILL_SQL);
    const IN_WINDOW = new Date("2026-10-05T12:00:00Z");
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

    it("credits a member who made a candy board during the event", async () => {
      const alice = await member("alice");
      await db.halloweenCandyBoard.create({
        data: { guildId: GUILD_ID, ownerId: alice.id, createdAt: IN_WINDOW },
      });
      await backfill();
      expect(await earned(alice.id)).toEqual([
        expect.objectContaining({ earnedAt: IN_WINDOW }),
      ]);
    });

    it("skips a board made before the event, even if it changed during it", async () => {
      const alice = await member("alice");
      const board = await db.halloweenCandyBoard.create({
        data: {
          guildId: GUILD_ID,
          ownerId: alice.id,
          createdAt: BEFORE_WINDOW,
        },
      });
      await db.$executeRaw`UPDATE halloween_candy_boards SET updated_at = ${IN_WINDOW} WHERE id = ${board.id}::uuid`;
      await backfill();
      expect(await earned(alice.id)).toEqual([]);
    });

    it("dates it from the earliest activity", async () => {
      const alice = await member("alice");
      await db.halloweenCandyBoard.create({
        data: {
          guildId: GUILD_ID,
          ownerId: alice.id,
          createdAt: later(IN_WINDOW, 60_000),
        },
      });
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
