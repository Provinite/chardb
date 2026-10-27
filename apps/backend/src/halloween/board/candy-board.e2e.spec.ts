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

const BOARD_FIELDS = `
  id
  viewerIsOwner
  owner { username }
  candies { knockEventId slug receivedAt }
  placements { knockEventId x y rotation scale }
`;

const BOARD = `
  query Board($communityId: ID!, $id: ID!) {
    halloweenCandyBoard(communityId: $communityId, id: $id) { ${BOARD_FIELDS} }
  }
`;

const MY_BOARD = `
  query MyBoard($communityId: ID!) {
    myHalloweenCandyBoard(communityId: $communityId) { ${BOARD_FIELDS} }
  }
`;

const APPLY = `
  mutation Apply($communityId: ID!, $actions: [HalloweenCandyBoardAction!]!) {
    applyHalloweenCandyBoardActions(communityId: $communityId, actions: $actions) {
      ${BOARD_FIELDS}
    }
  }
`;

describe("Halloween candy board (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let communityId: string;
  let playerToken: string;
  let playerUsername: string;
  let otherToken: string;
  let unlinkedToken: string;

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

  const linkedUser = async (name: string, discordId: string) => {
    const user = await testApp.createTestUser({
      username: `${name}_${Date.now()}`,
      email: `${name}_${Date.now()}@example.com`,
    });
    await db.externalAccount.create({
      data: {
        userId: user.id,
        provider: ExternalAccountProvider.DISCORD,
        providerAccountId: discordId,
        displayName: name,
      },
    });
    return {
      username: user.username,
      token: await testApp.generateTestToken(user.id, user.username),
    };
  };

  beforeEach(async () => {
    await testApp.clearDatabase();

    const community = await testApp.createTestCommunity();
    communityId = community.id;
    await db.community.update({
      where: { id: communityId },
      data: { discordGuildId: GUILD, halloweenEnabled: true },
    });

    const player = await linkedUser("player", PLAYER);
    playerUsername = player.username;
    playerToken = player.token;
    otherToken = (await linkedUser("other", OTHER_PLAYER)).token;

    const unlinked = await testApp.createTestUser({
      username: `unlinked_${Date.now()}`,
      email: `unlinked_${Date.now()}@example.com`,
    });
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

  const at = (knockEventId: number, overrides = {}) => ({
    knockEventId,
    x: 0.5,
    y: 0.25,
    rotation: -15,
    scale: 1.5,
    ...overrides,
  });

  const add = (knockEventId: number, overrides = {}) => ({
    add: at(knockEventId, overrides),
  });

  const myBoard = async (token = playerToken) => {
    const res = await testApp.authenticatedGraphqlRequest(
      MY_BOARD,
      { communityId },
      token,
    );
    return res;
  };

  const apply = (actions: object[], token = playerToken) =>
    testApp.authenticatedGraphqlRequest(APPLY, { communityId, actions }, token);

  const placementsNow = async () =>
    (await myBoard()).body.data.myHalloweenCandyBoard.placements;

  describe("your own board", () => {
    it("is made the first time you ask, and is the same board after", async () => {
      const first = await myBoard();
      expect(first.body.errors).toBeUndefined();
      const board = first.body.data.myHalloweenCandyBoard;
      expect(board).toMatchObject({
        viewerIsOwner: true,
        owner: { username: playerUsername },
        candies: [],
        placements: [],
      });
      expect(board.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );

      const again = await myBoard();
      expect(again.body.data.myHalloweenCandyBoard.id).toBe(board.id);
    });

    it("has your candies, oldest first, and no one else's", async () => {
      const first = await knock({
        candySlug: "luther-head",
        time: new Date("2026-10-20T00:00:00Z"),
      });
      const second = await knock({ time: new Date("2026-10-21T00:00:00Z") });
      await db.halloweenGuildSettings.create({
        data: { guildId: GUILD, resetTime: 6, knocksPerDay: 3, winRate: 0.4 },
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
      // A win, a loss from before candies were recorded, another player's,
      // and one from another guild.
      await knock({ prizeId: "myo", candySlug: null });
      await knock({ candySlug: null });
      await knock({ userId: OTHER_PLAYER });
      await knock({ guildId: OTHER_GUILD });

      const res = await myBoard();
      expect(res.body.data.myHalloweenCandyBoard.candies).toEqual([
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
      ]);
    });

    it("is nothing without Discord linked", async () => {
      const res = await myBoard(unlinkedToken);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.myHalloweenCandyBoard).toBeNull();
    });

    it("says so when the community has no Discord server", async () => {
      await db.community.update({
        where: { id: communityId },
        data: { discordGuildId: null },
      });
      const res = await myBoard();
      expect(res.body.errors?.[0].message).toBe(
        "This community has no Discord server linked",
      );
    });

    it("needs a signed-in player", async () => {
      const res = await testApp.graphqlRequest(MY_BOARD, { communityId });
      expect(res.body.errors).toBeDefined();
      expect(res.body.data?.myHalloweenCandyBoard ?? null).toBeNull();
      expect(await db.halloweenCandyBoard.count()).toBe(0);
    });
  });

  describe("looking at a board by its id", () => {
    it("shows anyone the board, and that it is not theirs", async () => {
      const candy = await knock();
      const { id } = (await myBoard()).body.data.myHalloweenCandyBoard;
      await apply([add(candy.id)]);

      const res = await testApp.graphqlRequest(BOARD, { communityId, id });
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.halloweenCandyBoard).toMatchObject({
        id,
        viewerIsOwner: false,
        owner: { username: playerUsername },
        placements: [at(candy.id)],
      });
    });

    it("knows its owner when they look", async () => {
      const { id } = (await myBoard()).body.data.myHalloweenCandyBoard;
      const res = await testApp.authenticatedGraphqlRequest(
        BOARD,
        { communityId, id },
        playerToken,
      );
      expect(res.body.data.halloweenCandyBoard.viewerIsOwner).toBe(true);
    });

    it("still shows a board whose owner unlinked Discord, without a name", async () => {
      const { id } = (await myBoard()).body.data.myHalloweenCandyBoard;
      await db.externalAccount.deleteMany({
        where: { providerAccountId: PLAYER },
      });
      const res = await testApp.graphqlRequest(BOARD, { communityId, id });
      expect(res.body.data.halloweenCandyBoard).toMatchObject({
        id,
        owner: null,
      });
    });

    it("refuses to show a stored board that is not in the expected shape", async () => {
      const { id } = (await myBoard()).body.data.myHalloweenCandyBoard;
      await db.$executeRaw`UPDATE halloween_candy_boards SET placements = '[{"knockEventId":"x"}]'::jsonb WHERE id = ${id}::uuid`;
      const res = await testApp.graphqlRequest(BOARD, { communityId, id });
      expect(res.body.errors?.[0].message).toBe(
        "A stored candy board is not in the expected shape",
      );
    });

    it("is nothing for an id that is no board, or not a uuid at all", async () => {
      for (const id of ["00000000-0000-4000-8000-000000000000", "nope"]) {
        const res = await testApp.graphqlRequest(BOARD, { communityId, id });
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.halloweenCandyBoard).toBeNull();
      }
    });

    it("is nothing on another community's host", async () => {
      const { id } = (await myBoard()).body.data.myHalloweenCandyBoard;
      const other = await testApp.createTestCommunity();
      await db.community.update({
        where: { id: other.id },
        data: { discordGuildId: OTHER_GUILD, halloweenEnabled: true },
      });
      const res = await testApp.graphqlRequest(BOARD, {
        communityId: other.id,
        id,
      });
      expect(res.body.data.halloweenCandyBoard).toBeNull();
    });

    it("refuses while the event is off for the community", async () => {
      const { id } = (await myBoard()).body.data.myHalloweenCandyBoard;
      await db.community.update({
        where: { id: communityId },
        data: { halloweenEnabled: false },
      });
      const res = await testApp.graphqlRequest(BOARD, { communityId, id });
      expect(res.body.errors?.[0].message).toBe(
        "The Halloween event is not enabled for this community",
      );
    });
  });

  describe("arranging a board", () => {
    it("adds candies on top of the pile, even before the board was opened", async () => {
      const a = await knock();
      const b = await knock({ candySlug: "luther-head" });

      const res = await apply([add(b.id), add(a.id, { x: 0, y: 1 })]);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.applyHalloweenCandyBoardActions.placements).toEqual([
        at(b.id),
        at(a.id, { x: 0, y: 1 }),
      ]);
    });

    it("adds at no turn and normal size unless told otherwise", async () => {
      const a = await knock();
      await apply([{ add: { knockEventId: a.id, x: 0.1, y: 0.2 } }]);
      expect(await placementsNow()).toEqual([
        { knockEventId: a.id, x: 0.1, y: 0.2, rotation: 0, scale: 1 },
      ]);
    });

    it("edits only what it names", async () => {
      const a = await knock();
      await apply([add(a.id)]);
      await apply([{ edit: { knockEventId: a.id, scale: 2 } }]);
      expect(await placementsNow()).toEqual([at(a.id, { scale: 2 })]);
    });

    it("raises a candy to the top of the pile", async () => {
      const a = await knock();
      const b = await knock();
      await apply([add(a.id), add(b.id)]);
      await apply([{ raise: { knockEventId: a.id } }]);
      expect(await placementsNow()).toEqual([at(b.id), at(a.id)]);
    });

    it("lowers a candy to the bottom of the pile", async () => {
      const a = await knock();
      const b = await knock();
      await apply([add(a.id), add(b.id)]);
      await apply([{ lower: { knockEventId: b.id } }]);
      expect(await placementsNow()).toEqual([at(b.id), at(a.id)]);
    });

    it("moves a candy forward and backward one place at a time", async () => {
      const [a, b, c] = await Promise.all([knock(), knock(), knock()]);
      await apply([add(a.id), add(b.id), add(c.id)]);
      await apply([{ forward: { knockEventId: a.id } }]);
      expect(await placementsNow()).toEqual([at(b.id), at(a.id), at(c.id)]);
      await apply([{ backward: { knockEventId: c.id } }]);
      expect(await placementsNow()).toEqual([at(b.id), at(c.id), at(a.id)]);
    });

    it("puts a candy back in the tray", async () => {
      const a = await knock();
      const b = await knock();
      await apply([add(a.id), add(b.id)]);
      await apply([{ remove: { knockEventId: a.id } }]);
      expect(await placementsNow()).toEqual([at(b.id)]);
    });

    it("leaves candies the actions do not name alone", async () => {
      const a = await knock();
      const b = await knock();
      await apply([add(a.id)]);
      // As a second tab would, knowing nothing of `a`.
      await apply([add(b.id)]);
      expect(await placementsNow()).toEqual([at(a.id), at(b.id)]);
    });

    it("loses nothing when two batches arrive at once", async () => {
      const candies = await Promise.all(
        Array.from({ length: 6 }, () => knock()),
      );
      await myBoard();
      await Promise.all(candies.map((c) => apply([add(c.id)])));
      const placed = (await placementsNow()).map(
        (p: { knockEventId: number }) => p.knockEventId,
      );
      expect(placed.sort()).toEqual(candies.map((c) => c.id).sort());
    });

    it("applies a batch whole or not at all", async () => {
      const a = await knock();
      const theirs = await knock({ userId: OTHER_PLAYER });
      const res = await apply([add(a.id), add(theirs.id)]);
      expect(res.body.errors?.[0].message).toBe(
        "Only your own candies can go on your board",
      );
      expect(await placementsNow()).toEqual([]);
    });

    it.each([
      ["another player's", { userId: OTHER_PLAYER }],
      ["a win's", { candySlug: null }],
      ["another guild's", { guildId: OTHER_GUILD }],
    ])("refuses to add %s knock", async (_what, data) => {
      const k = await knock(data);
      const res = await apply([add(k.id)]);
      expect(res.body.errors?.[0].message).toBe(
        "Only your own candies can go on your board",
      );
    });

    it("refuses to add a candy already on the board", async () => {
      const a = await knock();
      await apply([add(a.id)]);
      const res = await apply([add(a.id)]);
      expect(res.body.errors?.[0].message).toBe(
        "That candy is already on the board",
      );
    });

    it.each([
      ["edit", { x: 0.5 }],
      ["raise", {}],
      ["lower", {}],
      ["forward", {}],
      ["backward", {}],
      ["remove", {}],
    ])("refuses to %s a candy not on the board", async (kind, fields) => {
      const a = await knock();
      const res = await apply([{ [kind]: { knockEventId: a.id, ...fields } }]);
      expect(res.body.errors?.[0].message).toBe(
        "That candy is not on the board",
      );
    });

    it("refuses an edit that changes nothing", async () => {
      const a = await knock();
      await apply([add(a.id)]);
      const res = await apply([{ edit: { knockEventId: a.id } }]);
      expect(res.body.errors?.[0].message).toBe(
        "An edit needs something to change",
      );
    });

    // Both are the schema's to refuse, before any of the board is touched.
    it("refuses an add without a position", async () => {
      const a = await knock();
      const res = await apply([{ add: { knockEventId: a.id } }]);
      expect(res.body.errors?.[0].message).toMatch(/"x".*Float!/);
      expect(await placementsNow()).toEqual([]);
    });

    it("refuses an action that is two things at once", async () => {
      const a = await knock();
      const res = await apply([
        { add: at(a.id), remove: { knockEventId: a.id } },
      ]);
      expect(res.body.errors?.[0].message).toMatch(
        /Exactly one key must be specified for OneOf type/,
      );
      expect(await placementsNow()).toEqual([]);
    });

    it.each([
      ["x", { x: 1.01 }],
      ["y", { y: -0.01 }],
      ["rotation", { rotation: 181 }],
      ["scale", { scale: 0.1 }],
      ["scale", { scale: 5 }],
    ])("refuses %s out of range", async (_field, overrides) => {
      const a = await knock();
      const res = await apply([add(a.id, overrides)]);
      expect(res.body.errors?.[0].message).toBe(
        "A candy is placed off the board or at an impossible size",
      );
    });

    it("cannot reach another player's board", async () => {
      const mine = await knock();
      await apply([add(mine.id)]);
      // The other player's actions land on their own board, where this
      // candy is not.
      const res = await apply(
        [{ remove: { knockEventId: mine.id } }],
        otherToken,
      );
      expect(res.body.errors?.[0].message).toBe(
        "That candy is not on the board",
      );
      expect(await placementsNow()).toEqual([at(mine.id)]);
    });

    it("needs Discord linked", async () => {
      const res = await apply([], unlinkedToken);
      expect(res.body.errors?.[0].message).toBe(
        "Link your Discord account to have a candy board",
      );
    });

    it("needs a signed-in player", async () => {
      const res = await testApp.graphqlRequest(APPLY, {
        communityId,
        actions: [],
      });
      expect(res.body.errors).toBeDefined();
      expect(res.body.data).toBeNull();
    });
  });
});
