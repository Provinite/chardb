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
  candies { id slug receivedAt }
  placements { sticker { candy nameplate } x y rotation scale }
  background
  backgroundEffects { dim tint tintStrength saturation }
  lighting { x y height intensity colour colourStrength spotlight cone }
  name { first joiner last }
`;

const SET_NAME = `
  mutation SetName($communityId: ID!, $id: ID!, $name: HalloweenCandyBoardNameInput) {
    setHalloweenCandyBoardName(communityId: $communityId, id: $id, name: $name) {
      ${BOARD_FIELDS}
    }
  }
`;

const SET_LIGHTING = `
  mutation SetLighting($communityId: ID!, $id: ID!, $lighting: HalloweenCandyLightingInput) {
    setHalloweenCandyBoardLighting(communityId: $communityId, id: $id, lighting: $lighting) {
      ${BOARD_FIELDS}
    }
  }
`;

const SET_BACKGROUND = `
  mutation SetBackground(
    $communityId: ID!
    $id: ID!
    $slug: String
    $effects: HalloweenCandyBackgroundEffectsInput
  ) {
    setHalloweenCandyBoardBackground(
      communityId: $communityId
      id: $id
      slug: $slug
      effects: $effects
    ) {
      ${BOARD_FIELDS}
    }
  }
`;

const BOARD = `
  query Board($communityId: ID!, $id: ID!) {
    halloweenCandyBoard(communityId: $communityId, id: $id) { ${BOARD_FIELDS} }
  }
`;

const MY_BOARDS = `
  query MyBoards($communityId: ID!) {
    myHalloweenCandyBoards(communityId: $communityId) { ${BOARD_FIELDS} }
  }
`;

const CREATE = `
  mutation Create($communityId: ID!) {
    createHalloweenCandyBoard(communityId: $communityId) { ${BOARD_FIELDS} }
  }
`;

const DELETE = `
  mutation Delete($communityId: ID!, $id: ID!) {
    deleteHalloweenCandyBoard(communityId: $communityId, id: $id)
  }
`;

const APPLY = `
  mutation Apply($communityId: ID!, $id: ID!, $actions: [HalloweenCandyBoardAction!]!) {
    applyHalloweenCandyBoardActions(communityId: $communityId, id: $id, actions: $actions) {
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
  /** The player's board, made fresh for each test. */
  let boardId: string;

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
    owners.set(discordId, user.id);
    return {
      username: user.username,
      token: await testApp.generateTestToken(user.id, user.username),
    };
  };

  /** The chardb user behind each Discord player, who owns their candies. */
  const owners = new Map<string, string>();

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

    boardId = (await create()).body.data.createHalloweenCandyBoard.id;
  });

  const create = (token = playerToken) =>
    testApp.authenticatedGraphqlRequest(CREATE, { communityId }, token);

  const myBoards = (token = playerToken) =>
    testApp.authenticatedGraphqlRequest(MY_BOARDS, { communityId }, token);

  /** A knock, and the candy it gave its player if it lost. */
  const knock = async (
    data: Partial<{
      guildId: string;
      userId: string;
      prizeId: string | null;
      candySlug: string | null;
      time: Date;
    }> = {},
  ) => {
    const k = await db.halloweenKnockEvent.create({
      data: {
        guildId: GUILD,
        userId: PLAYER,
        candySlug: "candy-corn",
        ...data,
      },
    });
    // A win gives no candy: an id no candy has stands in for one.
    if (!k.candySlug) return { id: 1_000_000 + k.id };
    return db.halloweenCandy.create({
      data: {
        guildId: k.guildId,
        slug: k.candySlug,
        knockEventId: k.id,
        discordUserId: k.userId,
        ownerId: owners.get(k.userId) ?? null,
        receivedAt: k.time,
      },
    });
  };

  /** Puts a candy in an open offer, which takes it out of the tray. */
  const holdInOffer = async (candyId: number) => {
    const candy = await db.halloweenCandy.findUniqueOrThrow({
      where: { id: candyId },
    });
    const offer = await db.halloweenCandyOffer.create({
      data: {
        guildId: candy.guildId,
        ownerId: candy.ownerId ?? "",
        wantSlug: "banana",
      },
    });
    await db.halloweenCandy.update({
      where: { id: candyId },
      data: { offerId: offer.id },
    });
  };

  /** A sticker: a candy, by its id, or the board's nameplate. */
  type Ref = number | "nameplate";
  /** A sticker as an action names it: exactly one field. */
  const sticker = (ref: Ref) =>
    ref === "nameplate" ? { nameplate: true } : { candy: ref };
  const PLACED = { x: 0.5, y: 0.25, rotation: -15, scale: 1.5 };

  /** A placement as the board gives it back, its sticker's other field null. */
  const at = (ref: Ref, overrides = {}) => ({
    sticker:
      ref === "nameplate"
        ? { candy: null, nameplate: true }
        : { candy: ref, nameplate: null },
    ...PLACED,
    ...overrides,
  });

  const add = (ref: Ref, overrides = {}) => ({
    add: { sticker: sticker(ref), ...PLACED, ...overrides },
  });

  /** The player's board, as they see it. */
  const myBoard = (token = playerToken, id = boardId) =>
    testApp.authenticatedGraphqlRequest(BOARD, { communityId, id }, token);

  const apply = (actions: object[], token = playerToken, id = boardId) =>
    testApp.authenticatedGraphqlRequest(
      APPLY,
      { communityId, id, actions },
      token,
    );

  const placementsNow = async () =>
    (await myBoard()).body.data.halloweenCandyBoard.placements;

  describe("your boards", () => {
    it("makes a new board, empty and yours", async () => {
      const res = await create();
      expect(res.body.errors).toBeUndefined();
      const board = res.body.data.createHalloweenCandyBoard;
      expect(board).toMatchObject({
        viewerIsOwner: true,
        owner: { username: playerUsername },
        candies: [],
        placements: [],
        name: null,
      });
      expect(board.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(board.id).not.toBe(boardId);
    });

    it("lists yours, the last changed first, and no one else's", async () => {
      const second = (await create()).body.data.createHalloweenCandyBoard.id;
      await create(otherToken);
      // The first board, changed since the second was made.
      await testApp.authenticatedGraphqlRequest(
        SET_BACKGROUND,
        { communityId, id: boardId, slug: "tile-corkboard" },
        playerToken,
      );

      const res = await myBoards();
      expect(res.body.errors).toBeUndefined();
      expect(
        res.body.data.myHalloweenCandyBoards.map((b: { id: string }) => b.id),
      ).toEqual([boardId, second]);
    });

    it("lets every board use your whole collection", async () => {
      const a = await knock();
      const second = (await create()).body.data.createHalloweenCandyBoard.id;
      await apply([add(a.id)]);
      const res = await apply([add(a.id)], playerToken, second);
      expect(res.body.data.applyHalloweenCandyBoardActions.placements).toEqual([
        at(a.id),
      ]);
      expect(await placementsNow()).toEqual([at(a.id)]);
    });

    it("refuses an eleventh board", async () => {
      for (let i = 1; i < 10; i++) await create();
      const res = await create();
      expect(res.body.errors?.[0].message).toBe(
        "You can have at most 10 candy boards",
      );
      expect((await myBoards()).body.data.myHalloweenCandyBoards).toHaveLength(
        10,
      );
    });

    it("deletes a board for good", async () => {
      const res = await testApp.authenticatedGraphqlRequest(
        DELETE,
        { communityId, id: boardId },
        playerToken,
      );
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.deleteHalloweenCandyBoard).toBe(true);
      expect((await myBoards()).body.data.myHalloweenCandyBoards).toEqual([]);
      const seen = await testApp.graphqlRequest(BOARD, {
        communityId,
        id: boardId,
      });
      expect(seen.body.data.halloweenCandyBoard).toBeNull();
    });

    it("refuses to delete, or change, a board that is not yours", async () => {
      const deleted = await testApp.authenticatedGraphqlRequest(
        DELETE,
        { communityId, id: boardId },
        otherToken,
      );
      expect(deleted.body.errors?.[0].message).toBe(
        "There is no such candy board of yours",
      );
      const a = await knock();
      const changed = await apply([add(a.id)], otherToken);
      expect(changed.body.errors?.[0].message).toBe(
        "There is no such candy board of yours",
      );
      expect(await placementsNow()).toEqual([]);
    });

    it("refuses a board that does not exist", async () => {
      for (const id of ["00000000-0000-4000-8000-000000000000", "nope"]) {
        const res = await apply([], playerToken, id);
        expect(res.body.errors?.[0].message).toBe(
          "There is no such candy board of yours",
        );
      }
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
      expect(res.body.data.halloweenCandyBoard.candies).toEqual([
        {
          id: first.id,
          slug: "luther-head",
          receivedAt: "2026-10-20T00:00:00.000Z",
        },
        {
          id: second.id,
          slug: "candy-corn",
          receivedAt: "2026-10-21T00:00:00.000Z",
        },
      ]);
    });

    it("leave out a candy held in an offer, and drop it from the board", async () => {
      const kept = await knock();
      const offered = await knock();
      await apply([add(kept.id), add(offered.id)]);

      await holdInOffer(offered.id);

      const board = (await myBoard()).body.data.halloweenCandyBoard;
      expect(board.candies.map((c: { id: number }) => c.id)).toEqual([kept.id]);
      expect(board.placements).toEqual([at(kept.id)]);
      const res = await apply([add(offered.id, { x: 0.1 })]);
      expect(res.body.errors).toBeUndefined();
      expect(await placementsNow()).toEqual([at(kept.id)]);
    });

    it("are nothing without Discord linked, and none can be made", async () => {
      const res = await myBoards(unlinkedToken);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.myHalloweenCandyBoards).toBeNull();
      expect((await create(unlinkedToken)).body.errors?.[0].message).toBe(
        "Link your Discord account to have a candy board",
      );
    });

    it("says so when the community has no Discord server", async () => {
      await db.community.update({
        where: { id: communityId },
        data: { discordGuildId: null },
      });
      const res = await myBoards();
      expect(res.body.errors?.[0].message).toBe(
        "This community has no Discord server linked",
      );
    });

    it("needs a signed-in player", async () => {
      const res = await testApp.graphqlRequest(MY_BOARDS, { communityId });
      expect(res.body.errors).toBeDefined();
      expect(res.body.data?.myHalloweenCandyBoards ?? null).toBeNull();
      const made = await testApp.graphqlRequest(CREATE, { communityId });
      expect(made.body.errors).toBeDefined();
      expect(await db.halloweenCandyBoard.count()).toBe(1);
    });
  });

  describe("looking at a board by its id", () => {
    it("shows anyone the board, and that it is not theirs", async () => {
      const candy = await knock();
      const { id } = (await myBoard()).body.data.halloweenCandyBoard;
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
      const { id } = (await myBoard()).body.data.halloweenCandyBoard;
      const res = await testApp.authenticatedGraphqlRequest(
        BOARD,
        { communityId, id },
        playerToken,
      );
      expect(res.body.data.halloweenCandyBoard.viewerIsOwner).toBe(true);
    });

    it("still shows a board, and whose it is, after its owner unlinks Discord", async () => {
      const { id } = (await myBoard()).body.data.halloweenCandyBoard;
      await db.externalAccount.deleteMany({
        where: { providerAccountId: PLAYER },
      });
      const res = await testApp.graphqlRequest(BOARD, { communityId, id });
      expect(res.body.data.halloweenCandyBoard).toMatchObject({
        id,
        owner: { username: playerUsername },
      });
    });

    it("refuses to show a stored board that is not in the expected shape", async () => {
      const { id } = (await myBoard()).body.data.halloweenCandyBoard;
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
      const { id } = (await myBoard()).body.data.halloweenCandyBoard;
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
      const { id } = (await myBoard()).body.data.halloweenCandyBoard;
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
      await apply([{ add: { sticker: sticker(a.id), x: 0.1, y: 0.2 } }]);
      expect(await placementsNow()).toEqual([
        at(a.id, { x: 0.1, y: 0.2, rotation: 0, scale: 1 }),
      ]);
    });

    it("edits only what it names", async () => {
      const a = await knock();
      await apply([add(a.id)]);
      await apply([{ edit: { sticker: sticker(a.id), scale: 2 } }]);
      expect(await placementsNow()).toEqual([at(a.id, { scale: 2 })]);
    });

    it("raises a candy to the top of the pile", async () => {
      const a = await knock();
      const b = await knock();
      await apply([add(a.id), add(b.id)]);
      await apply([{ raise: sticker(a.id) }]);
      expect(await placementsNow()).toEqual([at(b.id), at(a.id)]);
    });

    it("lowers a candy to the bottom of the pile", async () => {
      const a = await knock();
      const b = await knock();
      await apply([add(a.id), add(b.id)]);
      await apply([{ lower: sticker(b.id) }]);
      expect(await placementsNow()).toEqual([at(b.id), at(a.id)]);
    });

    it("moves a candy forward and backward one place at a time", async () => {
      const [a, b, c] = await Promise.all([knock(), knock(), knock()]);
      await apply([add(a.id), add(b.id), add(c.id)]);
      await apply([{ forward: sticker(a.id) }]);
      expect(await placementsNow()).toEqual([at(b.id), at(a.id), at(c.id)]);
      await apply([{ backward: sticker(c.id) }]);
      expect(await placementsNow()).toEqual([at(b.id), at(c.id), at(a.id)]);
    });

    it("puts a candy back in the tray", async () => {
      const a = await knock();
      const b = await knock();
      await apply([add(a.id), add(b.id)]);
      await apply([{ remove: sticker(a.id) }]);
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
        (p: { sticker: { candy: number } }) => p.sticker.candy,
      );
      expect(placed.sort()).toEqual(candies.map((c) => c.id).sort());
    });

    /** What a save sent back: the board's placements as they now are. */
    const returned = (res: {
      body: { data: Record<string, { placements: unknown }> };
    }) => res.body.data.applyHalloweenCandyBoardActions.placements;

    // A change that cannot apply is skipped and the rest of the batch lands;
    // the board sent back is how it now is, so the page needs telling nothing
    // else.
    describe("skipping what cannot apply", () => {
      it.each([
        ["another player's candy", { userId: OTHER_PLAYER }],
        ["a candy that does not exist", { candySlug: null }],
        ["your candy from another guild", { guildId: OTHER_GUILD }],
      ])("skips adding %s, and adds the rest", async (_what, data) => {
        const mine = await knock();
        const k = await knock(data);
        const res = await apply([add(k.id), add(mine.id)]);
        expect(res.body.errors).toBeUndefined();
        expect(returned(res)).toEqual([at(mine.id)]);
        expect(await placementsNow()).toEqual([at(mine.id)]);
      });

      it("skips adding a candy already on the board", async () => {
        const a = await knock();
        await apply([add(a.id)]);
        // As a retry of a save that landed but whose answer was lost.
        const res = await apply([add(a.id, { x: 0.9 })]);
        expect(res.body.errors).toBeUndefined();
        expect(returned(res)).toEqual([at(a.id)]);
      });

      it.each(["edit", "raise", "lower", "forward", "backward", "remove"])(
        "skips a %s of a candy not on the board",
        async (kind) => {
          const a = await knock();
          const b = await knock();
          const res = await apply([
            kind === "edit"
              ? { edit: { sticker: sticker(a.id), x: 0.5 } }
              : { [kind]: sticker(a.id) },
            add(b.id),
          ]);
          expect(res.body.errors).toBeUndefined();
          expect(returned(res)).toEqual([at(b.id)]);
        },
      );

      it("skips adding a nameplate that is false", async () => {
        const res = await apply([
          { add: { sticker: { nameplate: false }, ...PLACED } },
        ]);
        expect(res.body.errors).toBeUndefined();
        expect(returned(res)).toEqual([]);
      });

      it("refuses a sticker that is a candy and the nameplate at once", async () => {
        const a = await knock();
        const res = await apply([
          { add: { sticker: { candy: a.id, nameplate: true }, ...PLACED } },
        ]);
        expect(res.body.errors?.[0].message).toMatch(
          /Exactly one key must be specified for OneOf type/,
        );
      });

      it("skips an edit that changes nothing", async () => {
        const a = await knock();
        await apply([add(a.id)]);
        const res = await apply([{ edit: { sticker: sticker(a.id) } }]);
        expect(res.body.errors).toBeUndefined();
        expect(returned(res)).toEqual([at(a.id)]);
      });

      it.each([
        ["x", { x: 1.01 }],
        ["y", { y: -0.01 }],
        ["rotation", { rotation: 181 }],
        ["scale", { scale: 0.1 }],
        ["scale", { scale: 5 }],
      ])(
        "skips a candy placed with %s out of range",
        async (_field, overrides) => {
          const a = await knock();
          const res = await apply([add(a.id, overrides)]);
          expect(res.body.errors).toBeUndefined();
          expect(returned(res)).toEqual([]);
        },
      );

      it("cannot reach another player's board", async () => {
        const mine = await knock();
        await apply([add(mine.id)]);
        const theirs = (await create(otherToken)).body.data
          .createHalloweenCandyBoard.id;
        // The other player's actions land on their own board, where this
        // candy is not.
        const res = await apply(
          [{ remove: sticker(mine.id) }],
          otherToken,
          theirs,
        );
        expect(returned(res)).toEqual([]);
        expect(await placementsNow()).toEqual([at(mine.id)]);
      });
    });

    it("refuses more than 100 changes in one save", async () => {
      const a = await knock();
      await apply([add(a.id)]);
      const many = Array.from({ length: 101 }, () => ({
        raise: sticker(a.id),
      }));
      const res = await apply(many);
      expect(res.body.errors?.[0].message).toBe(
        "Too many changes to save at once: at most 100",
      );
      expect((await apply(many.slice(0, 100))).body.errors).toBeUndefined();
    });

    // Both are the schema's to refuse, before any of the board is touched.
    it("refuses an add without a position", async () => {
      const a = await knock();
      const res = await apply([{ add: { sticker: sticker(a.id) } }]);
      expect(res.body.errors?.[0].message).toMatch(/"x".*Float!/);
      expect(await placementsNow()).toEqual([]);
    });

    it("refuses an action that is two things at once", async () => {
      const a = await knock();
      const res = await apply([{ ...add(a.id), remove: sticker(a.id) }]);
      expect(res.body.errors?.[0].message).toMatch(
        /Exactly one key must be specified for OneOf type/,
      );
      expect(await placementsNow()).toEqual([]);
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
        id: boardId,
        actions: [],
      });
      expect(res.body.errors).toBeDefined();
      expect(res.body.data).toBeNull();
    });
  });

  describe("lighting the board", () => {
    const REFUSED =
      "The light must be over the board, at a height from 0.1 to 1, with an intensity from 0 to 1, coloured #rrggbb at a strength from 0 to 1, and a spotlight and cone from 0 to 1";
    type Light = {
      x: number;
      y: number;
      height: number;
      intensity: number;
      colour: string | null;
      colourStrength: number;
      spotlight: number;
      cone: number;
    };
    /** A white light over the middle, with whatever differs. */
    const light = (changes: Partial<Light> = {}): Light => ({
      x: 0,
      y: 0,
      height: 0.5,
      intensity: 0.5,
      colour: null,
      colourStrength: 0,
      spotlight: 0,
      cone: 0.5,
      ...changes,
    });
    const setLighting = (lighting: Light | null, token = playerToken) =>
      testApp.authenticatedGraphqlRequest(
        SET_LIGHTING,
        { communityId, id: boardId, lighting },
        token,
      );

    it("starts with the default light", async () => {
      expect((await myBoard()).body.data.halloweenCandyBoard.lighting).toBe(
        null,
      );
    });

    it("sets where the light is, how high, how strong and what colour, and shows it to anyone", async () => {
      const lit = light({
        x: -0.6,
        y: -0.3,
        height: 0.4,
        intensity: 0.8,
        colour: "#f97316",
        colourStrength: 0.35,
        spotlight: 0.7,
        cone: 0.25,
      });
      const set = await setLighting(lit);
      expect(set.body.errors).toBeUndefined();
      const { id, lighting } = set.body.data.setHalloweenCandyBoardLighting;
      expect(lighting).toEqual(lit);

      const seen = await testApp.graphqlRequest(BOARD, { communityId, id });
      expect(seen.body.data.halloweenCandyBoard.lighting).toEqual(lit);
    });

    it("goes back to the default light", async () => {
      await setLighting(light({ x: 0.5, y: 0.5, colour: "#7c3aed" }));
      const res = await setLighting(null);
      expect(res.body.data.setHalloweenCandyBoardLighting.lighting).toBe(null);
    });

    it.each([
      ["outside the circle", light({ x: 0.9, y: 0.9 })],
      ["past the edge", light({ x: 1.2 })],
      ["too low", light({ height: 0.05 })],
      ["too high", light({ height: 1.5 })],
      ["too faint", light({ intensity: -0.1 })],
      ["too strong", light({ intensity: 1.1 })],
      ["coloured by name", light({ colour: "orange", colourStrength: 0.5 })],
      [
        "coloured too strongly",
        light({ colour: "#f97316", colourStrength: 2 }),
      ],
      ["coloured below none", light({ colour: "#f97316", colourStrength: -1 })],
      ["spotlit past full", light({ spotlight: 1.2 })],
      ["spotlit below none", light({ spotlight: -0.2 })],
      ["with too wide a cone", light({ cone: 1.5 })],
      ["with a cone below none", light({ cone: -0.5 })],
    ])("refuses a light %s", async (_what, lighting) => {
      const res = await setLighting(lighting);
      expect(res.body.errors?.[0].message).toBe(REFUSED);
      expect((await myBoard()).body.data.halloweenCandyBoard.lighting).toBe(
        null,
      );
    });

    it("needs Discord linked", async () => {
      const res = await setLighting(light(), unlinkedToken);
      expect(res.body.errors?.[0].message).toBe(
        "Link your Discord account to have a candy board",
      );
    });
  });

  describe("choosing a background", () => {
    type Effects = {
      dim: number;
      tint: string | null;
      tintStrength: number;
      saturation: number;
    };
    /** Untouched but for whatever differs. */
    const muted = (changes: Partial<Effects> = {}): Effects => ({
      dim: 0,
      tint: null,
      tintStrength: 0,
      saturation: 0.9,
      ...changes,
    });
    const setBackground = (
      slug: string | null,
      token = playerToken,
      effects: Effects | null = null,
    ) =>
      testApp.authenticatedGraphqlRequest(
        SET_BACKGROUND,
        { communityId, id: boardId, slug, effects },
        token,
      );

    describe("dimming and tinting it", () => {
      const REFUSED =
        "The background can be dimmed by up to 0.8, tinted a #rrggbb colour at a strength from 0 to 1, and saturated from 0 to 1";

      it("starts with neither", async () => {
        expect(
          (await myBoard()).body.data.halloweenCandyBoard.backgroundEffects,
        ).toBe(null);
      });

      it("saves them with the background, and shows them to anyone", async () => {
        const effects = muted({
          dim: 0.4,
          tint: "#7c3aed",
          tintStrength: 0.6,
          saturation: 0.3,
        });
        const set = await setBackground("tile-corkboard", playerToken, effects);
        expect(set.body.errors).toBeUndefined();
        const board = set.body.data.setHalloweenCandyBoardBackground;
        expect(board.background).toBe("tile-corkboard");
        expect(board.backgroundEffects).toEqual(effects);

        const seen = await testApp.graphqlRequest(BOARD, {
          communityId,
          id: board.id,
        });
        expect(seen.body.data.halloweenCandyBoard.backgroundEffects).toEqual(
          effects,
        );
      });

      it("dims without a tint", async () => {
        const effects = muted({ dim: 0.5 });
        const res = await setBackground(null, playerToken, effects);
        expect(
          res.body.data.setHalloweenCandyBoardBackground.backgroundEffects,
        ).toEqual(effects);
      });

      it("drops them when a background is set without any", async () => {
        await setBackground("tile-corkboard", playerToken, muted({ dim: 0.4 }));
        const res = await setBackground("tile-corkboard");
        expect(
          res.body.data.setHalloweenCandyBoardBackground.backgroundEffects,
        ).toBe(null);
      });

      it.each([
        ["dimmed too far", muted({ dim: 0.9 })],
        ["brightened", muted({ dim: -0.1 })],
        ["tinted a name", muted({ tint: "purple", tintStrength: 0.5 })],
        ["tinted a short colour", muted({ tint: "#fff", tintStrength: 0.5 })],
        ["tinted too strongly", muted({ tint: "#7c3aed", tintStrength: 1.5 })],
        ["tinted below none", muted({ tint: "#7c3aed", tintStrength: -1 })],
        ["oversaturated", muted({ saturation: 1.5 })],
        ["below grey", muted({ saturation: -0.1 })],
      ])("refuses a background %s", async (_what, effects) => {
        const res = await setBackground("tile-corkboard", playerToken, effects);
        expect(res.body.errors?.[0].message).toBe(REFUSED);
        const { background, backgroundEffects } = (await myBoard()).body.data
          .halloweenCandyBoard;
        expect(background).toBe(null);
        expect(backgroundEffects).toBe(null);
      });
    });

    it("starts with none chosen", async () => {
      expect((await myBoard()).body.data.halloweenCandyBoard.background).toBe(
        null,
      );
    });

    it("sets a full picture or a tile, and shows it to anyone", async () => {
      const set = await setBackground("tile-corkboard");
      expect(set.body.errors).toBeUndefined();
      const { id, background } = set.body.data.setHalloweenCandyBoardBackground;
      expect(background).toBe("tile-corkboard");

      await setBackground("daphne-luther-hug");
      const seen = await testApp.graphqlRequest(BOARD, { communityId, id });
      expect(seen.body.data.halloweenCandyBoard.background).toBe(
        "daphne-luther-hug",
      );
    });

    it("goes back to none chosen", async () => {
      await setBackground("tile-corkboard");
      const res = await setBackground(null);
      expect(res.body.data.setHalloweenCandyBoardBackground.background).toBe(
        null,
      );
    });

    it("leaves the candies where they are", async () => {
      const a = await knock();
      await apply([add(a.id)]);
      const res = await setBackground("tile-corkboard");
      expect(res.body.data.setHalloweenCandyBoardBackground.placements).toEqual(
        [at(a.id)],
      );
    });

    it("refuses a background there is no such picture for", async () => {
      const res = await setBackground("tile-nonsense");
      expect(res.body.errors?.[0].message).toBe("There is no such background");
      expect((await myBoard()).body.data.halloweenCandyBoard.background).toBe(
        null,
      );
    });

    it("needs Discord linked", async () => {
      const res = await setBackground("tile-corkboard", unlinkedToken);
      expect(res.body.errors?.[0].message).toBe(
        "Link your Discord account to have a candy board",
      );
    });
  });

  describe("naming the board", () => {
    const REFUSED =
      "A board's name is a first and a last word, and any joiner, from their lists";
    type Name = { first: string; joiner: string | null; last: string };
    const setName = (name: Name | null, token = playerToken) =>
      testApp.authenticatedGraphqlRequest(
        SET_NAME,
        { communityId, id: boardId, name },
        token,
      );

    it("starts unnamed", async () => {
      expect((await myBoard()).body.data.halloweenCandyBoard.name).toBe(null);
    });

    it("names the board, and shows it to anyone", async () => {
      const name = { first: "Moonlit", joiner: "von", last: "Pumpkin" };
      const set = await setName(name);
      expect(set.body.errors).toBeUndefined();
      const { id, name: saved } = set.body.data.setHalloweenCandyBoardName;
      expect(saved).toEqual(name);

      const seen = await testApp.graphqlRequest(BOARD, { communityId, id });
      expect(seen.body.data.halloweenCandyBoard.name).toEqual(name);
    });

    it("names it without a joiner", async () => {
      const name = { first: "Spooky", joiner: null, last: "Cauldron" };
      const res = await setName(name);
      expect(res.body.data.setHalloweenCandyBoardName.name).toEqual(name);
    });

    it("unnames it", async () => {
      await setName({ first: "Spooky", joiner: null, last: "Cauldron" });
      const res = await setName(null);
      expect(res.body.data.setHalloweenCandyBoardName.name).toBe(null);
    });

    it.each([
      [
        "a first word not on its list",
        { first: "Nice", joiner: null, last: "Pumpkin" },
      ],
      [
        "a last word not on its list",
        { first: "Spooky", joiner: null, last: "Car" },
      ],
      [
        "a joiner not on its list",
        { first: "Spooky", joiner: "with", last: "Pumpkin" },
      ],
      [
        "a word in the wrong place",
        { first: "Cauldron", joiner: null, last: "Spooky" },
      ],
    ])("refuses %s", async (_what, name) => {
      const res = await setName(name);
      expect(res.body.errors?.[0].message).toBe(REFUSED);
      expect((await myBoard()).body.data.halloweenCandyBoard.name).toBe(null);
    });

    it("needs Discord linked", async () => {
      const res = await setName(
        { first: "Spooky", joiner: null, last: "Cauldron" },
        unlinkedToken,
      );
      expect(res.body.errors?.[0].message).toBe(
        "Link your Discord account to have a candy board",
      );
    });

    describe("its nameplate", () => {
      const NAMEPLATE = "nameplate";
      const spooky = { first: "Spooky", joiner: null, last: "Cauldron" };

      it("goes on a named board, alongside its candies", async () => {
        const a = await knock();
        await setName(spooky);
        const res = await apply([add(a.id), add(NAMEPLATE, { y: 0.1 })]);
        expect(res.body.errors).toBeUndefined();
        expect(
          res.body.data.applyHalloweenCandyBoardActions.placements,
        ).toEqual([at(a.id), at(NAMEPLATE, { y: 0.1 })]);
      });

      it("moves, turns and comes off as a candy does", async () => {
        await setName(spooky);
        await apply([add(NAMEPLATE)]);
        await apply([{ edit: { sticker: sticker(NAMEPLATE), rotation: 10 } }]);
        expect(await placementsNow()).toEqual([
          at(NAMEPLATE, { rotation: 10 }),
        ]);
        await apply([{ remove: sticker(NAMEPLATE) }]);
        expect(await placementsNow()).toEqual([]);
      });

      it("is skipped on a board with no name", async () => {
        await apply([add(NAMEPLATE)]);
        expect(await placementsNow()).toEqual([]);
      });

      it("goes once only", async () => {
        await setName(spooky);
        await apply([add(NAMEPLATE), add(NAMEPLATE, { x: 0.9 })]);
        expect(await placementsNow()).toEqual([at(NAMEPLATE)]);
      });

      it("is hidden while the board has no name, and back where it was when named again", async () => {
        await setName(spooky);
        await apply([add(NAMEPLATE, { x: 0.3 })]);
        await setName(null);
        expect(await placementsNow()).toEqual([]);

        await setName(spooky);
        expect(await placementsNow()).toEqual([at(NAMEPLATE, { x: 0.3 })]);
      });
    });
  });
});
