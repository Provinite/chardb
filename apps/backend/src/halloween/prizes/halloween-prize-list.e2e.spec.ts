import { ExternalAccountProvider, ModerationStatus } from "@chardb/database";
import { TestApp } from "../../../test/setup-e2e";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../../auth/auth.module";
import { DatabaseService } from "../../database/database.service";
import { HalloweenModule } from "../halloween.module";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { mockDiscord } from "../testing/command-harness";
import { HalloweenClock } from "../clock";
import { fixedClock } from "../testing/fixtures";

const NOW = "2025-10-15T17:00:00.000Z";

const GUILD = "100000000000000001";
const OTHER_GUILD = "100000000000000002";
/** Unlinked; the knock recorded their Discord handle. */
const NAMED_WINNER = "200000000000000001";
/** Linked to a chardb account. */
const LINKED_WINNER = "200000000000000002";
/** Unlinked, from before knocks recorded names; a pending ownership has it. */
const PENDING_WINNER = "200000000000000003";
/** Unlinked, with no name stored anywhere. */
const NAMELESS_WINNER = "200000000000000004";

const PRIZES = `
  query Prizes($communityId: ID!) {
    halloweenPrizes(communityId: $communityId) {
      id
      name
      image
      initialStock
      currentStock
      itemTypeId
      characterId
    }
  }
`;

const RECENT_WINS = `
  query RecentWins($communityId: ID!, $limit: Int) {
    halloweenRecentWins(communityId: $communityId, limit: $limit) {
      id
      time
      prize { id name image }
      winner {
        kind
        displayName
        url
        user { id username }
      }
    }
  }
`;

describe("Halloween prize list (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let communityId: string;
  let staffToken: string;
  let managerToken: string;
  let memberToken: string;
  let linkedUsername: string;
  let linkedUserId: string;
  let itemTypeId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup(
      { imports: [DatabaseModule, AuthModule, HalloweenModule] },
      (builder) =>
        builder
          .overrideProvider(HalloweenDiscordClient)
          .useValue(mockDiscord())
          .overrideProvider(HalloweenClock)
          .useValue(fixedClock(NOW)),
    );
    db = testApp.getDb();
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
      data: { discordGuildId: GUILD, halloweenEnabled: true },
    });

    const stamp = Date.now();
    const staff = await testApp.createTestUser({
      username: `staff_${stamp}`,
      email: `staff_${stamp}@example.com`,
    });
    await testApp.createTestCommunityMember(
      staff.id,
      (await testApp.createTestRole(communityId, { canGrantItems: true })).id,
    );
    staffToken = await testApp.generateTestToken(staff.id, staff.username);

    const manager = await testApp.createTestUser({
      username: `manager_${stamp}`,
      email: `manager_${stamp}@example.com`,
    });
    await testApp.createTestCommunityMember(
      manager.id,
      (await testApp.createTestRole(communityId, { canManageItems: true })).id,
    );
    managerToken = await testApp.generateTestToken(
      manager.id,
      manager.username,
    );

    const member = await testApp.createTestUser({
      username: `member_${stamp}`,
      email: `member_${stamp}@example.com`,
    });
    await testApp.createTestCommunityMember(
      member.id,
      (await testApp.createTestRole(communityId, {})).id,
    );
    memberToken = await testApp.generateTestToken(member.id, member.username);

    // Linked, but not a member of this community.
    const linked = await testApp.createTestUser({
      username: `linked_${stamp}`,
      email: `linked_${stamp}@example.com`,
    });
    linkedUsername = linked.username;
    linkedUserId = linked.id;
    await db.externalAccount.create({
      data: {
        userId: linked.id,
        provider: ExternalAccountProvider.DISCORD,
        providerAccountId: LINKED_WINNER,
        displayName: "linked-on-discord",
      },
    });

    await seedEvent(staff.id);
  });

  const seedEvent = async (uploaderId: string) => {
    const candyImage = await db.image.create({
      data: {
        filename: "candy.png",
        originalFilename: "candy.png",
        originalUrl: "https://cdn.test/candy/original.png",
        mediumUrl: "https://cdn.test/candy/medium.webp",
        uploaderId,
        width: 100,
        height: 100,
        fileSize: 999,
        mimeType: "image/png",
        moderationStatus: ModerationStatus.APPROVED,
      },
    });
    const itemType = await db.itemType.create({
      data: { name: "Candy Corn", communityId, imageId: candyImage.id },
    });
    itemTypeId = itemType.id;
    await db.halloweenGuildSettings.create({
      data: {
        guildId: GUILD,
        resetTime: 6,
        knocksPerDay: 3,
        winRate: 0.4,
        winChannel: "300000000000000009",
      },
    });
    await db.halloweenPrize.createMany({
      data: [
        {
          guildId: GUILD,
          id: "ghost",
          name: "A Ghost",
          initialStock: 1,
          currentStock: 0,
          weight: 7,
          image: "https://i.test/ghost.png",
        },
        {
          guildId: GUILD,
          id: "candy",
          name: "Candy Corn",
          initialStock: 5,
          currentStock: 4,
          weight: 13,
          itemTypeId: itemType.id,
        },
        {
          guildId: GUILD,
          id: "adopt",
          name: "Spooky Adopt",
          initialStock: 2,
          currentStock: 1,
          weight: 11,
          image: "https://i.test/adopt.png",
        },
      ],
    });
    const win = (
      userId: string,
      prizeId: string,
      time: string,
      extra: { discordUsername?: string; isPending?: boolean } = {},
    ) =>
      db.halloweenKnockEvent.create({
        data: { guildId: GUILD, userId, prizeId, time: new Date(time), ...extra },
      });
    await win(NAMED_WINNER, "adopt", "2025-10-10T00:00:00Z", {
      discordUsername: "spookyfan",
    });
    await win(LINKED_WINNER, "candy", "2025-10-11T00:00:00Z");
    await win(PENDING_WINNER, "candy", "2025-10-12T00:00:00Z");
    await win(NAMELESS_WINNER, "ghost", "2025-10-13T00:00:00Z");
    // Not shown: a win still waiting for its prize, a loss, another guild's.
    await win(NAMED_WINNER, "adopt", "2025-10-14T00:00:00Z", {
      isPending: true,
    });
    await db.halloweenKnockEvent.create({
      data: {
        guildId: GUILD,
        userId: NAMED_WINNER,
        time: new Date("2025-10-14T01:00:00Z"),
        candySlug: "candy-corn",
      },
    });
    await db.halloweenGuildSettings.create({
      data: {
        guildId: OTHER_GUILD,
        resetTime: 6,
        knocksPerDay: 3,
        winRate: 0.4,
        winChannel: "300000000000000008",
      },
    });
    await db.halloweenPrize.create({
      data: {
        guildId: OTHER_GUILD,
        id: "adopt",
        name: "Elsewhere Adopt",
        initialStock: 1,
        currentStock: 1,
        weight: 1,
      },
    });
    await db.halloweenKnockEvent.create({
      data: {
        guildId: OTHER_GUILD,
        userId: NAMED_WINNER,
        prizeId: "adopt",
        time: new Date("2025-10-14T02:00:00Z"),
      },
    });

    await db.halloweenDeviantArtUser.create({
      data: { guildId: GUILD, userId: NAMED_WINNER, deviantArtName: "da-fan" },
    });
    const item = await db.item.create({ data: { itemTypeId: itemType.id } });
    await db.pendingOwnership.create({
      data: {
        itemId: item.id,
        provider: ExternalAccountProvider.DISCORD,
        providerAccountId: PENDING_WINNER,
        displayIdentifier: "oldhandle",
        displayName: "Old Handle",
      },
    });
  };

  describe("halloweenPrizes", () => {
    it("lists every prize to a signed-out visitor, in stock first", async () => {
      const res = await testApp.graphqlRequest(PRIZES, { communityId });

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.halloweenPrizes).toEqual([
        {
          id: "candy",
          name: "Candy Corn",
          image: "https://cdn.test/candy/medium.webp",
          initialStock: 5,
          currentStock: 4,
          itemTypeId,
          characterId: null,
        },
        {
          id: "adopt",
          name: "Spooky Adopt",
          image: "https://i.test/adopt.png",
          initialStock: 2,
          currentStock: 1,
          itemTypeId: null,
          characterId: null,
        },
        {
          id: "ghost",
          name: "A Ghost",
          image: "https://i.test/ghost.png",
          initialStock: 1,
          currentStock: 0,
          itemTypeId: null,
          characterId: null,
        },
      ]);
    });

    it("has no weight to ask for", async () => {
      const res = await testApp.graphqlRequest(
        `query ($communityId: ID!) {
          halloweenPrizes(communityId: $communityId) { id weight }
        }`,
        { communityId },
      );

      expect(res.body.errors?.[0]?.message).toMatch(/weight/);
    });

    it("is empty while the event is off", async () => {
      await db.community.update({
        where: { id: communityId },
        data: { halloweenEnabled: false },
      });

      const res = await testApp.graphqlRequest(PRIZES, { communityId });

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.halloweenPrizes).toEqual([]);
    });
  });

  describe("halloweenRecentWins", () => {
    const expectAnonymousFeed = (body: {
      data: { halloweenRecentWins: unknown };
    }) => {
      expect(body.data.halloweenRecentWins).toEqual([
        expect.objectContaining({
          prize: expect.objectContaining({ id: "ghost" }),
          winner: {
            kind: "ANONYMOUS",
            displayName: "A Discord user",
            url: null,
            user: null,
          },
        }),
        expect.objectContaining({
          prize: expect.objectContaining({ id: "candy" }),
          winner: {
            kind: "ANONYMOUS",
            displayName: "A Discord user",
            url: null,
            user: null,
          },
        }),
        expect.objectContaining({
          prize: expect.objectContaining({ id: "candy" }),
          winner: {
            kind: "MEMBER",
            displayName: linkedUsername,
            url: `/user/${linkedUsername}`,
            user: { id: linkedUserId, username: linkedUsername },
          },
        }),
        expect.objectContaining({
          prize: expect.objectContaining({ id: "adopt" }),
          winner: {
            kind: "ANONYMOUS",
            displayName: "A Discord user",
            url: null,
            user: null,
          },
        }),
      ]);
      const raw = JSON.stringify(body);
      for (const secret of [
        NAMED_WINNER,
        LINKED_WINNER,
        PENDING_WINNER,
        NAMELESS_WINNER,
        "spookyfan",
        "oldhandle",
        "Old Handle",
        "da-fan",
        "linked-on-discord",
      ]) {
        expect(raw).not.toContain(secret);
      }
    };

    it("shows a signed-out visitor only chardb accounts, newest first", async () => {
      const res = await testApp.graphqlRequest(RECENT_WINS, { communityId });

      expect(res.body.errors).toBeUndefined();
      expectAnonymousFeed(res.body);
    });

    it("shows a member without item permissions the same as a visitor", async () => {
      const res = await testApp.authenticatedGraphqlRequest(
        RECENT_WINS,
        { communityId },
        memberToken,
      );

      expect(res.body.errors).toBeUndefined();
      expectAnonymousFeed(res.body);
    });

    it.each([
      ["canGrantItems", () => staffToken],
      ["canManageItems", () => managerToken],
    ])(
      "shows staff with %s the Discord handle of an unlinked winner",
      async (_permission, token) => {
        const res = await testApp.authenticatedGraphqlRequest(
          RECENT_WINS,
          { communityId },
          token(),
        );

        expect(res.body.errors).toBeUndefined();
        expect(
          res.body.data.halloweenRecentWins.map(
            (w: { winner: unknown }) => w.winner,
          ),
        ).toEqual([
          {
            kind: "DISCORD",
            displayName: `Discord user ${NAMELESS_WINNER}`,
            url: `https://discord.com/users/${NAMELESS_WINNER}`,
            user: null,
          },
          {
            kind: "DISCORD",
            displayName: "oldhandle",
            url: `https://discord.com/users/${PENDING_WINNER}`,
            user: null,
          },
          {
            kind: "MEMBER",
            displayName: linkedUsername,
            url: `/user/${linkedUsername}`,
            user: { id: linkedUserId, username: linkedUsername },
          },
          {
            kind: "DISCORD",
            displayName: "spookyfan",
            url: `https://discord.com/users/${NAMED_WINNER}`,
            user: null,
          },
        ]);
      },
    );

    it("takes 20 unless asked, and at most 50", async () => {
      await db.halloweenKnockEvent.createMany({
        data: Array.from({ length: 60 }, (_, i) => ({
          guildId: GUILD,
          userId: NAMELESS_WINNER,
          prizeId: "ghost",
          time: new Date(Date.parse("2025-10-01T00:00:00Z") + i * 1000),
        })),
      });

      const [byDefault, tooMany, none] = await Promise.all([
        testApp.graphqlRequest(RECENT_WINS, { communityId }),
        testApp.graphqlRequest(RECENT_WINS, { communityId, limit: 500 }),
        testApp.graphqlRequest(RECENT_WINS, { communityId, limit: 0 }),
      ]);

      expect(byDefault.body.data.halloweenRecentWins).toHaveLength(20);
      expect(tooMany.body.data.halloweenRecentWins).toHaveLength(50);
      expect(none.body.data.halloweenRecentWins).toHaveLength(1);
    });

    it("is empty while the event is off", async () => {
      await db.community.update({
        where: { id: communityId },
        data: { halloweenEnabled: false },
      });

      const res = await testApp.graphqlRequest(RECENT_WINS, { communityId });

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.halloweenRecentWins).toEqual([]);
    });
  });
});
