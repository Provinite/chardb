import { ExternalAccountProvider } from "@chardb/database";
import { TestApp } from "../../../test/setup-e2e";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../../auth/auth.module";
import { DatabaseService } from "../../database/database.service";
import { HalloweenModule } from "../halloween.module";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { mockDiscord } from "../testing/command-harness";

const GUILD = "100000000000000001";
const OTHER_GUILD = "100000000000000002";
const PLAYER = "200000000000000001";
const OTHER_PLAYER = "200000000000000002";

const BOARD = `
  query Board($communityId: ID!, $username: String!) {
    halloweenCandyBoard(communityId: $communityId, username: $username) {
      owner { username }
      candies { knockEventId slug receivedAt }
      placements { knockEventId x y rotation scale }
    }
  }
`;

const SAVE = `
  mutation Save($communityId: ID!, $placements: [HalloweenCandyPlacementInput!]!) {
    saveHalloweenCandyBoard(communityId: $communityId, placements: $placements) {
      placements { knockEventId x y rotation scale }
    }
  }
`;

describe("Halloween candy board (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let communityId: string;
  let playerToken: string;
  let playerUsername: string;
  let unlinkedToken: string;
  let unlinkedUsername: string;

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

    const player = await testApp.createTestUser({
      username: `player_${Date.now()}`,
    });
    playerUsername = player.username;
    await db.externalAccount.create({
      data: {
        userId: player.id,
        provider: ExternalAccountProvider.DISCORD,
        providerAccountId: PLAYER,
        displayName: "player",
      },
    });
    playerToken = await testApp.generateTestToken(player.id, player.username);

    const unlinked = await testApp.createTestUser({
      username: `unlinked_${Date.now()}`,
      email: `unlinked_${Date.now()}@example.com`,
    });
    unlinkedUsername = unlinked.username;
    unlinkedToken = await testApp.generateTestToken(
      unlinked.id,
      unlinked.username,
    );
  });

  const knock = (
    data: Partial<{
      guildId: string;
      userId: string;
      prizeId: string | null;
      candySlug: string | null;
      time: Date;
    }> = {},
  ) =>
    db.halloweenKnockEvent.create({
      data: {
        guildId: GUILD,
        userId: PLAYER,
        candySlug: "candy-corn",
        ...data,
      },
    });

  const place = (knockEventId: number, overrides = {}) => ({
    knockEventId,
    x: 0.5,
    y: 0.25,
    rotation: -15,
    scale: 1.5,
    ...overrides,
  });

  const readBoard = (username: string) =>
    testApp.graphqlRequest(BOARD, { communityId, username });

  const save = (placements: object[], token = playerToken) =>
    testApp.authenticatedGraphqlRequest(
      SAVE,
      { communityId, placements },
      token,
    );

  describe("reading a board", () => {
    it("shows anyone a player's candies, oldest first, with nothing placed yet", async () => {
      const first = await knock({
        candySlug: "luther-head",
        time: new Date("2026-10-20T00:00:00Z"),
      });
      const second = await knock({ time: new Date("2026-10-21T00:00:00Z") });
      // Not the player's candies: a win, a loss from before candies were
      // recorded, another player's, and one from another guild.
      await db.halloweenGuildSettings.create({
        data: {
          guildId: GUILD,
          resetTime: 6,
          knocksPerDay: 3,
          winRate: 0.4,
        },
      });
      await db.halloweenPrize.create({
        data: {
          guildId: GUILD,
          id: "myo",
          name: "MYO",
          initialStock: 1,
          currentStock: 0,
          weight: 1,
        },
      });
      await knock({ prizeId: "myo", candySlug: null });
      await knock({ candySlug: null });
      await knock({ userId: OTHER_PLAYER });
      await knock({ guildId: OTHER_GUILD });

      const res = await readBoard(playerUsername);

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.halloweenCandyBoard).toEqual({
        owner: { username: playerUsername },
        candies: [
          {
            knockEventId: first.id,
            slug: "luther-head",
            receivedAt: "2026-10-20T00:00:00.000Z",
          },
          {
            knockEventId: second.id,
            slug: "candy-corn",
            receivedAt: "2026-10-21T00:00:00.000Z",
          },
        ],
        placements: [],
      });
    });

    it("has no board for someone without Discord linked", async () => {
      const res = await readBoard(unlinkedUsername);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.halloweenCandyBoard).toBeNull();
    });

    it("has no board for a username nobody has", async () => {
      const res = await readBoard("nobody_by_this_name");
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.halloweenCandyBoard).toBeNull();
    });

    it("refuses while the event is off for the community", async () => {
      await db.community.update({
        where: { id: communityId },
        data: { halloweenEnabled: false },
      });
      const res = await readBoard(playerUsername);
      expect(res.body.errors?.[0].message).toBe(
        "The Halloween event is not enabled for this community",
      );
    });
  });

  describe("saving a board", () => {
    it("keeps the placements in the order given, bottom first", async () => {
      const a = await knock();
      const b = await knock({ candySlug: "luther-head" });

      const saved = await save([place(b.id), place(a.id, { x: 0, y: 1 })]);
      expect(saved.body.errors).toBeUndefined();

      const res = await readBoard(playerUsername);
      expect(res.body.data.halloweenCandyBoard.placements).toEqual([
        place(b.id),
        place(a.id, { x: 0, y: 1 }),
      ]);
    });

    it("replaces what was there", async () => {
      const a = await knock();
      const b = await knock();
      await save([place(a.id), place(b.id)]);

      await save([place(b.id, { scale: 2 })]);

      const res = await readBoard(playerUsername);
      expect(res.body.data.halloweenCandyBoard.placements).toEqual([
        place(b.id, { scale: 2 }),
      ]);
    });

    it("refuses a candy that is not the player's", async () => {
      const theirs = await knock({ userId: OTHER_PLAYER });
      const res = await save([place(theirs.id)]);
      expect(res.body.errors?.[0].message).toBe(
        "Only your own candies can go on your board",
      );
    });

    it("refuses a knock that gave no candy", async () => {
      const noCandy = await knock({ candySlug: null });
      const res = await save([place(noCandy.id)]);
      expect(res.body.errors?.[0].message).toBe(
        "Only your own candies can go on your board",
      );
    });

    it("refuses a candy from another guild", async () => {
      const elsewhere = await knock({ guildId: OTHER_GUILD });
      const res = await save([place(elsewhere.id)]);
      expect(res.body.errors?.[0].message).toBe(
        "Only your own candies can go on your board",
      );
    });

    it("refuses the same candy twice", async () => {
      const a = await knock();
      const res = await save([place(a.id), place(a.id)]);
      expect(res.body.errors?.[0].message).toBe(
        "A candy can only be on the board once",
      );
    });

    it.each([
      ["x", { x: 1.01 }],
      ["y", { y: -0.01 }],
      ["rotation", { rotation: 181 }],
      ["scale", { scale: 0.1 }],
      ["scale", { scale: 5 }],
    ])("refuses %s out of range", async (_field, overrides) => {
      const a = await knock();
      const res = await save([place(a.id, overrides)]);
      expect(res.body.errors?.[0].message).toBe(
        "A candy is placed off the board or at an impossible size",
      );
    });

    it("needs Discord linked", async () => {
      const res = await save([], unlinkedToken);
      expect(res.body.errors?.[0].message).toBe(
        "Link your Discord account to have a candy board",
      );
    });

    it("needs a signed-in player", async () => {
      const res = await testApp.graphqlRequest(SAVE, {
        communityId,
        placements: [],
      });
      expect(res.body.errors).toBeDefined();
      expect(res.body.data).toBeNull();
    });
  });
});
