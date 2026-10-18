import { ExternalAccountProvider } from "@chardb/database";
import { TestApp } from "../../../test/setup-e2e";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../../auth/auth.module";
import { DatabaseService } from "../../database/database.service";
import { HalloweenModule } from "../halloween.module";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { mockDiscord } from "../testing/command-harness";

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
      summary { knocks wins giftiesSent players }
      prizes { id name initialStock currentStock weight delivery itemTypeId characterId }
      wins {
        id
        discordUserId
        linkedUser { id username }
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
          .useValue(mockDiscord()),
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
    const itemType = await db.itemType.create({
      data: { name: "Candy Corn", communityId },
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
          image: "https://i.test/candy.png",
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
    it("shows staff the settings, totals, prize pool and wins, newest first", async () => {
      const { adoptWin, candyWin, itemTypeId, linked } = await seedEvent();

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
        summary: { knocks: 3, wins: 2, giftiesSent: 1, players: 2 },
      });
      expect(dashboard.prizes).toEqual([
        {
          id: "adopt",
          name: "Spooky Adopt",
          initialStock: 2,
          currentStock: 1,
          weight: 10,
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
          delivery: "CHARDB_ITEM",
          itemTypeId,
          characterId: null,
        },
      ]);
      expect(dashboard.wins).toEqual([
        {
          id: candyWin.id,
          discordUserId: LINKED_WINNER,
          linkedUser: { id: linked.id, username: linked.username },
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
          deviantArtName: "spooky-fan",
          giftyFromDiscordUserId: null,
          prize: { id: "adopt", delivery: "STAFF" },
          deliveredAt: null,
          deliveredBy: null,
        },
      ]);
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
        summary: { knocks: 0, wins: 0, giftiesSent: 0, players: 0 },
        prizes: [],
        wins: [],
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
