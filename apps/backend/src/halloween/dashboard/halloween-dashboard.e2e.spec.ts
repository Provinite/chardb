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

/** Noon in Chicago (CDT), six hours after the 6 AM reset. */
const NOW = "2025-10-15T17:00:00.000Z";

const GUILD = "100000000000000001";
const WINNER = "200000000000000001";
const LINKED_WINNER = "200000000000000002";
const GIFTER = "200000000000000003";

const DASHBOARD = `
  query Dashboard($communityId: ID!) {
    halloweenDashboard(communityId: $communityId) {
      communityId
      guildId
      settings { knocksPerDay resetTime winRate winChannel startDate endDate }
      summary { knocks wins giftiesSent players toDeliver }
      prizes { id name initialStock currentStock weight image delivery itemTypeId characterId }
    }
  }
`;

const WINS = `
  query Wins($communityId: ID!, $filter: HalloweenWinFilter, $limit: Int, $offset: Int) {
    halloweenWins(communityId: $communityId, filter: $filter, limit: $limit, offset: $offset) {
      total
      hasMore
      wins {
        id
        discordUserId
        linkedUser { id username }
        linkedUserIsMember
        deviantArtName
        giftyFromDiscordUserId
        prize { id delivery }
        deliveredAt
        deliveredBy { id username }
      }
    }
  }
`;

const SET_DELIVERED = `
  mutation SetDelivered($communityId: ID!, $knockEventId: Int!, $delivered: Boolean!) {
    setHalloweenPrizeDelivered(
      communityId: $communityId
      knockEventId: $knockEventId
      delivered: $delivered
    ) {
      id
      deliveredAt
      deliveredBy { username }
    }
  }
`;

const SET_ENABLED = `
  mutation SetEnabled($communityId: ID!, $enabled: Boolean!) {
    setCommunityHalloweenEnabled(communityId: $communityId, enabled: $enabled) {
      id
      halloweenEnabled
    }
  }
`;

describe("Halloween dashboard (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let communityId: string;
  let staffToken: string;
  let staffUsername: string;
  let memberToken: string;
  let adminToken: string;

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

    const staff = await testApp.createTestUser({
      username: `staff_${Date.now()}`,
    });
    staffUsername = staff.username;
    const staffRole = await testApp.createTestRole(communityId, {
      canGrantItems: true,
    });
    await testApp.createTestCommunityMember(staff.id, staffRole.id);
    staffToken = await testApp.generateTestToken(staff.id, staff.username);

    const member = await testApp.createTestUser({
      username: `member_${Date.now()}`,
      email: `member_${Date.now()}@example.com`,
    });
    const memberRole = await testApp.createTestRole(communityId, {});
    await testApp.createTestCommunityMember(member.id, memberRole.id);
    memberToken = await testApp.generateTestToken(member.id, member.username);

    const admin = await testApp.createTestUser({
      username: `admin_${Date.now()}`,
      email: `admin_${Date.now()}@example.com`,
      isAdmin: true,
    });
    adminToken = await testApp.generateTestToken(admin.id, admin.username);
  });

  /** A guild mid-event: two prizes, two wins, a loss and a gifty. */
  const seedEvent = async () => {
    const uploader = await db.user.findFirstOrThrow({
      where: { username: staffUsername },
    });
    const candyImage = await db.image.create({
      data: {
        filename: "candy.png",
        originalFilename: "candy.png",
        originalUrl: "https://cdn.test/candy/original.png",
        mediumUrl: "https://cdn.test/candy/medium.webp",
        uploaderId: uploader.id,
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
          id: "adopt",
          name: "Spooky Adopt",
          initialStock: 2,
          currentStock: 1,
          weight: 10,
          image: "https://i.test/adopt.png",
        },
        {
          guildId: GUILD,
          id: "candy",
          name: "Candy Corn",
          initialStock: 5,
          currentStock: 4,
          weight: 10,
          image: null,
          itemTypeId: itemType.id,
        },
      ],
    });
    const adoptWin = await db.halloweenKnockEvent.create({
      data: {
        guildId: GUILD,
        userId: WINNER,
        prizeId: "adopt",
        time: new Date("2025-10-10T00:00:00Z"),
      },
    });
    const candyWin = await db.halloweenKnockEvent.create({
      data: {
        guildId: GUILD,
        userId: LINKED_WINNER,
        prizeId: "candy",
        time: new Date("2025-10-11T00:00:00Z"),
      },
    });
    await db.halloweenKnockEvent.create({
      data: {
        guildId: GUILD,
        userId: WINNER,
        time: new Date("2025-10-12T00:00:00Z"),
      },
    });
    await db.halloweenGifty.create({
      data: {
        guildId: GUILD,
        fromUserId: GIFTER,
        toUserId: LINKED_WINNER,
        knockEventId: candyWin.id,
      },
    });
    await db.halloweenDeviantArtUser.create({
      data: { guildId: GUILD, userId: WINNER, deviantArtName: "spooky-fan" },
    });
    const linked = await testApp.createTestUser({
      username: `linked_${Date.now()}`,
      email: `linked_${Date.now()}@example.com`,
    });
    await db.externalAccount.create({
      data: {
        userId: linked.id,
        provider: ExternalAccountProvider.DISCORD,
        providerAccountId: LINKED_WINNER,
        displayName: "linked",
      },
    });
    return { adoptWin, candyWin, itemTypeId: itemType.id, linked };
  };

  describe("halloweenDashboard", () => {
    it("shows staff the settings, totals and prize pool", async () => {
      const { itemTypeId } = await seedEvent();

      const res = await testApp.authenticatedGraphqlRequest(
        DASHBOARD,
        { communityId },
        staffToken,
      );

      expect(res.body.errors).toBeUndefined();
      const dashboard = res.body.data.halloweenDashboard;
      expect(dashboard).toMatchObject({
        communityId,
        guildId: GUILD,
        settings: { knocksPerDay: 3, resetTime: 6, winRate: 0.4 },
        // Two people knocked; one prize is staff-delivered and not yet handed over.
        summary: {
          knocks: 3,
          wins: 2,
          giftiesSent: 1,
          players: 2,
          toDeliver: 1,
        },
      });
      expect(dashboard.prizes).toEqual([
        {
          id: "adopt",
          name: "Spooky Adopt",
          initialStock: 2,
          currentStock: 1,
          weight: 10,
          image: "https://i.test/adopt.png",
          delivery: "STAFF",
          itemTypeId: null,
          characterId: null,
        },
        {
          id: "candy",
          name: "Candy Corn",
          initialStock: 5,
          currentStock: 4,
          weight: 10,
          // The item type's own, moderation-approved picture.
          image: "https://cdn.test/candy/medium.webp",
          delivery: "CHARDB_ITEM",
          itemTypeId,
          characterId: null,
        },
      ]);
    });

    it("counts players, knocks and gifty senders over the last 24 hours and each reset day", async () => {
      await seedEvent();
      const [a, b, c, d] = [
        "200000000000000011",
        "200000000000000012",
        "200000000000000013",
        "200000000000000014",
      ];
      const knock = (userId: string, time: string, prizeId?: string) =>
        db.halloweenKnockEvent.create({
          data: { guildId: GUILD, userId, prizeId, time: new Date(time) },
        });
      const gifty = (fromUserId: string, toUserId: string, time: string) =>
        db.halloweenGifty.create({
          data: { guildId: GUILD, fromUserId, toUserId, time: new Date(time) },
        });
      // Yesterday's reset day, before the last 24 hours.
      await knock(c, "2025-10-14T12:00:00Z");
      await gifty(c, b, "2025-10-14T12:30:00Z");
      // Yesterday's reset day, inside the last 24 hours.
      await knock(a, "2025-10-14T20:00:00Z");
      // Today's.
      await knock(a, "2025-10-15T12:00:00Z");
      await gifty(a, c, "2025-10-15T12:05:00Z");
      await knock(b, "2025-10-15T13:00:00Z", "adopt");
      // Sent by someone who has not knocked: a gifty, not a player.
      await gifty(d, a, "2025-10-15T14:00:00Z");

      const res = await testApp.authenticatedGraphqlRequest(
        `query Stats($communityId: ID!) {
          halloweenDashboard(communityId: $communityId) {
            summary {
              players
              unspentGifties
              last24Hours { ...Period }
              today { ...Period }
              yesterday { ...Period }
            }
          }
        }
        fragment Period on HalloweenPeriodStats {
          from to players knocks wins giftiesSent giftySenders
        }`,
        { communityId },
        staffToken,
      );

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.halloweenDashboard.summary).toEqual({
        players: 5,
        // The seed's own gifty paid for a knock; the three above did not.
        unspentGifties: 3,
        last24Hours: {
          from: "2025-10-14T17:00:00.000Z",
          to: NOW,
          players: 2,
          knocks: 3,
          wins: 1,
          giftiesSent: 2,
          giftySenders: 1,
        },
        today: {
          from: "2025-10-15T11:00:00.000Z",
          to: NOW,
          players: 2,
          knocks: 2,
          wins: 1,
          giftiesSent: 2,
          giftySenders: 1,
        },
        yesterday: {
          from: "2025-10-14T11:00:00.000Z",
          to: "2025-10-15T11:00:00.000Z",
          players: 2,
          knocks: 2,
          wins: 0,
          giftiesSent: 1,
          giftySenders: 1,
        },
      });
    });

    it("is empty, not an error, before a Discord server is linked", async () => {
      await db.community.update({
        where: { id: communityId },
        data: { discordGuildId: null },
      });
      const res = await testApp.authenticatedGraphqlRequest(
        DASHBOARD,
        { communityId },
        staffToken,
      );
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.halloweenDashboard).toMatchObject({
        guildId: null,
        settings: null,
        summary: {
          knocks: 0,
          wins: 0,
          giftiesSent: 0,
          players: 0,
          toDeliver: 0,
        },
        prizes: [],
      });
    });

    it("refuses members without permission to grant items", async () => {
      const res = await testApp.authenticatedGraphqlRequest(
        DASHBOARD,
        { communityId },
        memberToken,
      );
      expect(res.body.errors?.[0]).toBeDefined();
      expect(res.body.data).toBeNull();
    });

    it("refuses a community the event is not turned on for", async () => {
      await db.community.update({
        where: { id: communityId },
        data: { halloweenEnabled: false },
      });
      const res = await testApp.authenticatedGraphqlRequest(
        DASHBOARD,
        { communityId },
        staffToken,
      );
      expect(res.body.errors?.[0].message).toBe(
        "The Halloween event is not enabled for this community",
      );
    });
  });

  describe("halloweenWins", () => {
    const wins = (variables: Record<string, unknown>, token = staffToken) =>
      testApp.authenticatedGraphqlRequest(
        WINS,
        { communityId, ...variables },
        token,
      );

    it("lists every win newest first, with who won and how it is delivered", async () => {
      const { adoptWin, candyWin, linked } = await seedEvent();
      const res = await wins({});
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.halloweenWins).toEqual({
        total: 2,
        hasMore: false,
        wins: [
          {
            id: candyWin.id,
            discordUserId: LINKED_WINNER,
            linkedUser: { id: linked.id, username: linked.username },
            linkedUserIsMember: false,
            deviantArtName: null,
            giftyFromDiscordUserId: GIFTER,
            prize: { id: "candy", delivery: "CHARDB_ITEM" },
            deliveredAt: null,
            deliveredBy: null,
          },
          {
            id: adoptWin.id,
            discordUserId: WINNER,
            linkedUser: null,
            linkedUserIsMember: false,
            deviantArtName: "spooky-fan",
            giftyFromDiscordUserId: null,
            prize: { id: "adopt", delivery: "STAFF" },
            deliveredAt: null,
            deliveredBy: null,
          },
        ],
      });
    });

    // A chardb prize is theirs only once they are linked and a member.
    it("says whether a linked winner is a member of the community", async () => {
      const { candyWin, linked } = await seedEvent();
      await testApp.createTestCommunityMember(
        linked.id,
        (await testApp.createTestRole(communityId, {})).id,
      );
      const res = await wins({});
      const candy = res.body.data.halloweenWins.wins.find(
        (w: { id: number }) => w.id === candyWin.id,
      );
      expect(candy.linkedUserIsMember).toBe(true);
    });

    it("filters to the staff prizes still to hand over, and to those handed over", async () => {
      const { adoptWin } = await seedEvent();
      const needs = await wins({ filter: "NEEDS_DELIVERY" });
      expect(
        needs.body.data.halloweenWins.wins.map((w: { id: number }) => w.id),
      ).toEqual([adoptWin.id]);

      await testApp.authenticatedGraphqlRequest(
        SET_DELIVERED,
        { communityId, knockEventId: adoptWin.id, delivered: true },
        staffToken,
      );
      expect(
        (await wins({ filter: "NEEDS_DELIVERY" })).body.data.halloweenWins,
      ).toMatchObject({
        total: 0,
        wins: [],
      });
      expect(
        (await wins({ filter: "DELIVERED" })).body.data.halloweenWins.wins.map(
          (w: { id: number }) => w.id,
        ),
      ).toEqual([adoptWin.id]);
    });

    it("pages through the wins", async () => {
      const { adoptWin, candyWin } = await seedEvent();
      const first = await wins({ limit: 1, offset: 0 });
      expect(first.body.data.halloweenWins).toMatchObject({
        total: 2,
        hasMore: true,
        wins: [{ id: candyWin.id }],
      });
      const second = await wins({ limit: 1, offset: 1 });
      expect(second.body.data.halloweenWins).toMatchObject({
        total: 2,
        hasMore: false,
        wins: [{ id: adoptWin.id }],
      });
    });

    it("refuses members without permission to grant items", async () => {
      await seedEvent();
      const res = await wins({}, memberToken);
      expect(res.body.errors?.[0]).toBeDefined();
    });

    it("refuses a community the event is not turned on for", async () => {
      await db.community.update({
        where: { id: communityId },
        data: { halloweenEnabled: false },
      });
      const res = await wins({});
      expect(res.body.errors?.[0].message).toBe(
        "The Halloween event is not enabled for this community",
      );
    });
  });

  describe("setHalloweenPrizeDelivered", () => {
    it("records who handed over a staff prize, and can undo it", async () => {
      const { adoptWin } = await seedEvent();

      const marked = await testApp.authenticatedGraphqlRequest(
        SET_DELIVERED,
        { communityId, knockEventId: adoptWin.id, delivered: true },
        staffToken,
      );
      expect(marked.body.errors).toBeUndefined();
      expect(marked.body.data.setHalloweenPrizeDelivered).toMatchObject({
        id: adoptWin.id,
        deliveredAt: expect.any(String),
        deliveredBy: { username: staffUsername },
      });

      const undone = await testApp.authenticatedGraphqlRequest(
        SET_DELIVERED,
        { communityId, knockEventId: adoptWin.id, delivered: false },
        staffToken,
      );
      expect(undone.body.data.setHalloweenPrizeDelivered).toMatchObject({
        deliveredAt: null,
        deliveredBy: null,
      });
    });

    it("refuses a chardb prize, which delivers itself", async () => {
      const { candyWin } = await seedEvent();
      const res = await testApp.authenticatedGraphqlRequest(
        SET_DELIVERED,
        { communityId, knockEventId: candyWin.id, delivered: true },
        staffToken,
      );
      expect(res.body.errors?.[0].message).toBe(
        "This prize is a chardb item or character, which is delivered automatically",
      );
    });

    it("refuses a knock from another server", async () => {
      await seedEvent();
      await db.halloweenGuildSettings.create({
        data: { guildId: "999", resetTime: 6, knocksPerDay: 2, winRate: 0.5 },
      });
      await db.halloweenPrize.create({
        data: {
          guildId: "999",
          id: "other",
          name: "Other",
          initialStock: 1,
          currentStock: 0,
          weight: 1,
          image: "https://i.test/o.png",
        },
      });
      const elsewhere = await db.halloweenKnockEvent.create({
        data: { guildId: "999", userId: WINNER, prizeId: "other" },
      });
      const res = await testApp.authenticatedGraphqlRequest(
        SET_DELIVERED,
        { communityId, knockEventId: elsewhere.id, delivered: true },
        staffToken,
      );
      expect(res.body.errors?.[0].message).toBe(
        "No such win in this community",
      );
    });

    it("refuses members without permission to grant items", async () => {
      const { adoptWin } = await seedEvent();
      const res = await testApp.authenticatedGraphqlRequest(
        SET_DELIVERED,
        { communityId, knockEventId: adoptWin.id, delivered: true },
        memberToken,
      );
      expect(res.body.errors?.[0]).toBeDefined();
      expect(
        (
          await db.halloweenKnockEvent.findUniqueOrThrow({
            where: { id: adoptWin.id },
          })
        ).deliveredAt,
      ).toBeNull();
    });
  });

  describe("setCommunityHalloweenEnabled", () => {
    it("lets a site admin turn the event on and off", async () => {
      const off = await testApp.authenticatedGraphqlRequest(
        SET_ENABLED,
        { communityId, enabled: false },
        adminToken,
      );
      expect(off.body.errors).toBeUndefined();
      expect(off.body.data.setCommunityHalloweenEnabled).toEqual({
        id: communityId,
        halloweenEnabled: false,
      });
    });

    it("refuses anyone else, community staff included", async () => {
      const res = await testApp.authenticatedGraphqlRequest(
        SET_ENABLED,
        { communityId, enabled: false },
        staffToken,
      );
      expect(res.body.errors?.[0]).toBeDefined();
      expect(
        (await db.community.findUniqueOrThrow({ where: { id: communityId } }))
          .halloweenEnabled,
      ).toBe(true);
    });
  });
});
