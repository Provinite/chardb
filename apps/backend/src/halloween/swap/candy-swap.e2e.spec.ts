import { NotificationKind } from "@chardb/database";
import { TestApp } from "../../../test/setup-e2e";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../../auth/auth.module";
import { DatabaseService } from "../../database/database.service";
import { HalloweenModule } from "../halloween.module";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { mockDiscord } from "../testing/command-harness";

const GUILD = "100000000000000001";
const OTHER_GUILD = "100000000000000002";

const OFFER_FIELDS = `id wantSlug status candies { id slug }`;
const TRADE_FIELDS = `
  id
  with { username }
  gave
  received
`;

const PLACE = `
  mutation Place($communityId: ID!, $candyIds: [Int!]!, $wantSlug: String!) {
    placeHalloweenCandyOffer(communityId: $communityId, candyIds: $candyIds, wantSlug: $wantSlug) {
      offer { ${OFFER_FIELDS} }
      trade { ${TRADE_FIELDS} }
    }
  }
`;

const ACCEPT = `
  mutation Accept($communityId: ID!, $offerId: ID!) {
    acceptHalloweenCandyOffer(communityId: $communityId, offerId: $offerId) {
      ${TRADE_FIELDS}
    }
  }
`;

const CANCEL = `
  mutation Cancel($communityId: ID!, $offerId: ID!) {
    cancelHalloweenCandyOffer(communityId: $communityId, offerId: $offerId)
  }
`;

const BROWSE = `
  query Browse($communityId: ID!, $limit: Int) {
    halloweenCandySwapOffers(communityId: $communityId, limit: $limit) {
      ${OFFER_FIELDS}
    }
  }
`;

const MY_OFFERS = `
  query MyOffers($communityId: ID!) {
    myHalloweenCandyOffers(communityId: $communityId) { ${OFFER_FIELDS} }
  }
`;

const MY_CANDIES = `
  query MyCandies($communityId: ID!) {
    myHalloweenCandies(communityId: $communityId) { id slug }
  }
`;

const MY_TRADES = `
  query MyTrades($communityId: ID!) {
    myHalloweenCandyTrades(communityId: $communityId) { ${TRADE_FIELDS} }
  }
`;

const CANDY_TYPES = `
  query { halloweenCandyTypes }
`;

type Player = { id: string; username: string; token: string };

describe("Halloween candy swap (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let communityId: string;
  let alice: Player;
  let bob: Player;
  let carol: Player;
  let knockCount = 0;

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

  const player = async (name: string): Promise<Player> => {
    const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    const user = await testApp.createTestUser({
      username: `${name}_${stamp}`.slice(0, 30),
      email: `${name}_${stamp}@example.com`,
    });
    return {
      id: user.id,
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
    alice = await player("alice");
    bob = await player("bob");
    carol = await player("carol");
  });

  /** A candy owned by `owner`, as a lost knock would leave it. */
  const candy = async (
    owner: Player,
    slug: string,
    { guildId = GUILD, receivedAt = new Date() } = {},
  ) => {
    const knock = await db.halloweenKnockEvent.create({
      data: {
        guildId,
        userId: `2000000000000${String(++knockCount).padStart(5, "0")}`,
        candySlug: slug,
      },
    });
    return db.halloweenCandy.create({
      data: {
        guildId,
        slug,
        knockEventId: knock.id,
        discordUserId: knock.userId,
        ownerId: owner.id,
        receivedAt,
      },
    });
  };

  const gql = (query: string, variables: object, who: Player) =>
    testApp.authenticatedGraphqlRequest(
      query,
      { communityId, ...variables },
      who.token,
    );

  const place = (who: Player, candyIds: number[], wantSlug: string) =>
    gql(PLACE, { candyIds, wantSlug }, who);

  const placed = async (who: Player, candyIds: number[], wantSlug: string) => {
    const res = await place(who, candyIds, wantSlug);
    expect(res.body.errors).toBeUndefined();
    return res.body.data.placeHalloweenCandyOffer as {
      offer: { id: string; status: string };
      trade: {
        with: { username: string };
        gave: string[];
        received: string[];
      } | null;
    };
  };

  const ownerOf = async (candyId: number) =>
    (await db.halloweenCandy.findUniqueOrThrow({ where: { id: candyId } }))
      .ownerId;

  const error = (res: { body: { errors?: { message: string }[] } }) =>
    res.body.errors?.[0]?.message;

  describe("placing an offer", () => {
    it("holds the offered candies out of the tray until it is filled or cancelled", async () => {
      const corn = await candy(alice, "candy-corn");
      const tart = await candy(alice, "berry-tart");
      const kept = await candy(alice, "banana");

      const { offer, trade } = await placed(
        alice,
        [corn.id, tart.id],
        "luther-head",
      );

      expect(trade).toBeNull();
      expect(offer.status).toBe("OPEN");
      const tray = await gql(MY_CANDIES, {}, alice);
      expect(tray.body.data.myHalloweenCandies).toEqual([
        { id: kept.id, slug: "banana" },
      ]);
      const mine = await gql(MY_OFFERS, {}, alice);
      expect(mine.body.data.myHalloweenCandyOffers).toEqual([
        {
          id: offer.id,
          wantSlug: "luther-head",
          status: "OPEN",
          candies: [
            { id: corn.id, slug: "candy-corn" },
            { id: tart.id, slug: "berry-tart" },
          ],
        },
      ]);
    });

    it("gives the candies back when cancelled", async () => {
      const corn = await candy(alice, "candy-corn");
      const { offer } = await placed(alice, [corn.id], "banana");

      const res = await gql(CANCEL, { offerId: offer.id }, alice);

      expect(res.body.data.cancelHalloweenCandyOffer).toBe(true);
      const tray = await gql(MY_CANDIES, {}, alice);
      expect(tray.body.data.myHalloweenCandies).toEqual([
        { id: corn.id, slug: "candy-corn" },
      ]);
      const mine = await gql(MY_OFFERS, {}, alice);
      expect(mine.body.data.myHalloweenCandyOffers).toEqual([]);
    });

    it("does not let anyone else cancel it", async () => {
      const corn = await candy(alice, "candy-corn");
      const { offer } = await placed(alice, [corn.id], "banana");

      const res = await gql(CANCEL, { offerId: offer.id }, bob);

      expect(error(res)).toBe("There is no such open offer of yours");
      expect(
        await db.halloweenCandy.findUniqueOrThrow({ where: { id: corn.id } }),
      ).toMatchObject({ offerId: offer.id });
    });

    it("takes one to three candies", async () => {
      const candies = await Promise.all(
        ["banana", "berry-tart", "candy-corn", "bitten-pumpkin"].map((s) =>
          candy(alice, s),
        ),
      );
      for (const ids of [[], candies.map((c) => c.id)]) {
        expect(error(await place(alice, ids, "luther-head"))).toBe(
          "An offer is one to three of your candies",
        );
      }
    });

    it.each([
      ["someone else's candy", async () => (await candy(bob, "banana")).id],
      [
        "a candy from another community",
        async () => (await candy(alice, "banana", { guildId: OTHER_GUILD })).id,
      ],
      ["a candy that does not exist", () => Promise.resolve(999_999)],
    ])("refuses %s", async (_what, make) => {
      const id = await make();
      expect(error(await place(alice, [id], "luther-head"))).toBe(
        "You can only offer candies of yours that are not in another offer",
      );
    });

    it("refuses a candy already in another offer, or named twice", async () => {
      const corn = await candy(alice, "candy-corn");
      await placed(alice, [corn.id], "banana");
      expect(error(await place(alice, [corn.id], "berry-tart"))).toBe(
        "You can only offer candies of yours that are not in another offer",
      );

      const tart = await candy(alice, "berry-tart");
      expect(error(await place(alice, [tart.id, tart.id], "banana"))).toBe(
        "You can only offer candies of yours that are not in another offer",
      );
    });

    it("refuses to offer a candy of the kind it asks for", async () => {
      const corn = await candy(alice, "candy-corn");
      const tart = await candy(alice, "berry-tart");
      expect(error(await place(alice, [tart.id, corn.id], "candy-corn"))).toBe(
        "You cannot offer a candy of the kind you are asking for",
      );
    });

    it("refuses to ask for a candy that does not exist", async () => {
      const corn = await candy(alice, "candy-corn");
      expect(error(await place(alice, [corn.id], "brussels-sprout"))).toBe(
        "There is no such candy",
      );
    });

    it("allows at most ten open offers", async () => {
      for (let i = 0; i < 10; i++) {
        const c = await candy(alice, "candy-corn");
        await placed(alice, [c.id], "banana");
      }
      const eleventh = await candy(alice, "candy-corn");
      expect(error(await place(alice, [eleventh.id], "banana"))).toBe(
        "You can have at most 10 open offers",
      );
      expect(
        await db.halloweenCandyOffer.count({ where: { ownerId: alice.id } }),
      ).toBe(10);
    });

    it("needs a signed-in player", async () => {
      const corn = await candy(alice, "candy-corn");
      const res = await testApp.graphqlRequest(PLACE, {
        communityId,
        candyIds: [corn.id],
        wantSlug: "banana",
      });
      expect(res.body.errors).toBeDefined();
    });
  });

  describe("browsing offers", () => {
    it("shows other players' open offers you hold the wanted candy for", async () => {
      await candy(carol, "banana");
      const wantsBanana = await placed(
        alice,
        [(await candy(alice, "candy-corn")).id],
        "banana",
      );
      // Carol has no luther-head, so cannot fill this one.
      await placed(
        alice,
        [(await candy(alice, "berry-tart")).id],
        "luther-head",
      );
      // Carol's own offer is not shown to her.
      await candy(carol, "candy-corn");
      await placed(
        carol,
        [(await candy(carol, "bitten-pumpkin")).id],
        "banana",
      );
      // Nor is one that has been cancelled.
      const cancelled = await placed(
        bob,
        [(await candy(bob, "candy-corn")).id],
        "banana",
      );
      await gql(CANCEL, { offerId: cancelled.offer.id }, bob);

      const res = await gql(BROWSE, {}, carol);

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.halloweenCandySwapOffers).toEqual([
        {
          id: wantsBanana.offer.id,
          wantSlug: "banana",
          status: "OPEN",
          candies: [{ id: expect.any(Number), slug: "candy-corn" }],
        },
      ]);
    });

    it("does not count a candy you have in an offer as one you hold", async () => {
      const banana = await candy(carol, "banana");
      await placed(carol, [banana.id], "berry-tart");
      await placed(alice, [(await candy(alice, "candy-corn")).id], "banana");

      const res = await gql(BROWSE, {}, carol);

      expect(res.body.data.halloweenCandySwapOffers).toEqual([]);
    });

    it("shows at most `limit` of them", async () => {
      await candy(carol, "banana");
      for (let i = 0; i < 5; i++) {
        await placed(alice, [(await candy(alice, "candy-corn")).id], "banana");
      }
      const res = await gql(BROWSE, { limit: 3 }, carol);
      expect(res.body.data.halloweenCandySwapOffers).toHaveLength(3);
    });

    it("does not say whose an offer is", async () => {
      for (const field of ["owner { username }", "ownerId"]) {
        const res = await gql(
          `query Browse($communityId: ID!) {
            halloweenCandySwapOffers(communityId: $communityId) { ${field} }
          }`,
          {},
          carol,
        );
        expect(error(res)).toMatch(/Cannot query field/);
      }
    });
  });

  describe("accepting an offer", () => {
    it("trades your oldest spare candy of the wanted kind for the whole bundle", async () => {
      const corn = await candy(alice, "candy-corn");
      const tart = await candy(alice, "berry-tart");
      const { offer } = await placed(alice, [corn.id, tart.id], "banana");
      const older = await candy(bob, "banana", {
        receivedAt: new Date("2026-10-01T00:00:00Z"),
      });
      const newer = await candy(bob, "banana", {
        receivedAt: new Date("2026-10-20T00:00:00Z"),
      });

      const res = await gql(ACCEPT, { offerId: offer.id }, bob);

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.acceptHalloweenCandyOffer).toEqual({
        id: expect.any(String),
        with: { username: alice.username },
        gave: ["banana"],
        received: ["candy-corn", "berry-tart"],
      });
      expect(await ownerOf(corn.id)).toBe(bob.id);
      expect(await ownerOf(tart.id)).toBe(bob.id);
      expect(await ownerOf(older.id)).toBe(alice.id);
      expect(await ownerOf(newer.id)).toBe(bob.id);
      const traded = await db.halloweenCandy.findMany({
        where: { id: { in: [corn.id, tart.id, older.id] } },
      });
      expect(traded.every((c) => c.offerId === null)).toBe(true);
      expect(
        await db.halloweenCandyOffer.findUniqueOrThrow({
          where: { id: offer.id },
        }),
      ).toMatchObject({ status: "FILLED", tradeId: expect.any(String) });
    });

    it("tells the offerer who took it", async () => {
      const corn = await candy(alice, "candy-corn");
      const { offer } = await placed(alice, [corn.id], "banana");
      await candy(bob, "banana");

      await gql(ACCEPT, { offerId: offer.id }, bob);

      const notes = await db.notification.findMany();
      expect(notes).toEqual([
        expect.objectContaining({
          recipientId: alice.id,
          actorUserId: bob.id,
          kind: NotificationKind.HALLOWEEN_CANDY_TRADED,
          communityId,
          data: {},
        }),
      ]);
    });

    it("shows both sides the trade, and whom it was with", async () => {
      const corn = await candy(alice, "candy-corn");
      const { offer } = await placed(alice, [corn.id], "banana");
      await candy(bob, "banana");
      await gql(ACCEPT, { offerId: offer.id }, bob);

      const alices = await gql(MY_TRADES, {}, alice);
      expect(alices.body.data.myHalloweenCandyTrades).toEqual([
        {
          id: expect.any(String),
          with: { username: bob.username },
          gave: ["candy-corn"],
          received: ["banana"],
        },
      ]);
      const bobs = await gql(MY_TRADES, {}, bob);
      expect(bobs.body.data.myHalloweenCandyTrades).toEqual([
        {
          id: expect.any(String),
          with: { username: alice.username },
          gave: ["banana"],
          received: ["candy-corn"],
        },
      ]);
      expect(
        (await gql(MY_TRADES, {}, carol)).body.data.myHalloweenCandyTrades,
      ).toEqual([]);
    });

    it("refuses without a spare candy of the wanted kind", async () => {
      const { offer } = await placed(
        alice,
        [(await candy(alice, "candy-corn")).id],
        "banana",
      );
      const banana = await candy(bob, "banana");
      await placed(bob, [banana.id], "berry-tart");

      expect(error(await gql(ACCEPT, { offerId: offer.id }, bob))).toBe(
        "You have no spare candy of the kind this offer asks for",
      );
    });

    it("refuses your own offer", async () => {
      await candy(alice, "banana");
      const { offer } = await placed(
        alice,
        [(await candy(alice, "candy-corn")).id],
        "banana",
      );
      expect(error(await gql(ACCEPT, { offerId: offer.id }, alice))).toBe(
        "You cannot accept your own offer",
      );
    });

    it("refuses an offer that has been cancelled or taken", async () => {
      const { offer } = await placed(
        alice,
        [(await candy(alice, "candy-corn")).id],
        "banana",
      );
      await candy(bob, "banana");
      await candy(carol, "banana");
      await gql(ACCEPT, { offerId: offer.id }, bob);

      expect(error(await gql(ACCEPT, { offerId: offer.id }, carol))).toBe(
        "That offer is no longer open",
      );
      expect(error(await gql(CANCEL, { offerId: offer.id }, alice))).toBe(
        "There is no such open offer of yours",
      );
    });

    it("lets only one of two players accepting at once have it", async () => {
      const corn = await candy(alice, "candy-corn");
      const { offer } = await placed(alice, [corn.id], "banana");
      await candy(bob, "banana");
      await candy(carol, "banana");

      const results = await Promise.all([
        gql(ACCEPT, { offerId: offer.id }, bob),
        gql(ACCEPT, { offerId: offer.id }, carol),
      ]);

      expect(results.filter((r) => !r.body.errors)).toHaveLength(1);
      expect(await db.halloweenCandyTrade.count()).toBe(1);
      expect(
        await db.halloweenCandy.count({ where: { ownerId: alice.id } }),
      ).toBe(1);
    });
  });

  describe("matching offers", () => {
    it("trades straight away when a one-for-one offer meets its mirror", async () => {
      const corn = await candy(alice, "candy-corn");
      const first = await placed(alice, [corn.id], "banana");
      const banana = await candy(bob, "banana");

      const { offer, trade } = await placed(bob, [banana.id], "candy-corn");

      expect(offer.status).toBe("FILLED");
      expect(trade).toEqual({
        id: expect.any(String),
        with: { username: alice.username },
        gave: ["banana"],
        received: ["candy-corn"],
      });
      expect(await ownerOf(corn.id)).toBe(bob.id);
      expect(await ownerOf(banana.id)).toBe(alice.id);
      expect(
        await db.halloweenCandyOffer.findUniqueOrThrow({
          where: { id: first.offer.id },
        }),
      ).toMatchObject({ status: "FILLED" });
      const notes = await db.notification.findMany();
      expect(notes).toEqual([
        expect.objectContaining({
          recipientId: alice.id,
          actorUserId: bob.id,
          kind: NotificationKind.HALLOWEEN_CANDY_TRADED,
        }),
      ]);
    });

    it("picks one of several mirrors and leaves the rest open", async () => {
      await placed(alice, [(await candy(alice, "candy-corn")).id], "banana");
      await placed(carol, [(await candy(carol, "candy-corn")).id], "banana");
      const banana = await candy(bob, "banana");

      const { trade } = await placed(bob, [banana.id], "candy-corn");

      expect([alice.username, carol.username]).toContain(trade?.with.username);
      expect(
        await db.halloweenCandyOffer.count({ where: { status: "OPEN" } }),
      ).toBe(1);
    });

    it("does not match a bundle", async () => {
      await placed(
        alice,
        [
          (await candy(alice, "candy-corn")).id,
          (await candy(alice, "berry-tart")).id,
        ],
        "banana",
      );
      const banana = await candy(bob, "banana");

      const { offer, trade } = await placed(bob, [banana.id], "candy-corn");

      expect(trade).toBeNull();
      expect(offer.status).toBe("OPEN");
    });

    it("does not match an offer asking for something else", async () => {
      await placed(
        alice,
        [(await candy(alice, "candy-corn")).id],
        "berry-tart",
      );
      const banana = await candy(bob, "banana");

      const { trade } = await placed(bob, [banana.id], "candy-corn");

      expect(trade).toBeNull();
    });
  });

  it("lists every kind of candy there is", async () => {
    const res = await testApp.graphqlRequest(CANDY_TYPES, {});
    expect(res.body.data.halloweenCandyTypes).toEqual(
      expect.arrayContaining(["banana", "candy-corn", "luther-head"]),
    );
    expect(res.body.data.halloweenCandyTypes).not.toContain("brussels-sprout");
  });

  it("says how many candies an offer gives and how many offers can be open", async () => {
    const res = await testApp.graphqlRequest(
      `query { halloweenCandySwapLimits { maxOpenOffers maxOfferedCandies } }`,
      {},
    );
    expect(res.body.data.halloweenCandySwapLimits).toEqual({
      maxOpenOffers: 10,
      maxOfferedCandies: 3,
    });
  });

  describe("candies on boards", () => {
    /** A board of `owner`'s with these candies stuck on it. */
    const board = (owner: Player, candyIds: number[]) =>
      db.halloweenCandyBoard.create({
        data: {
          guildId: GUILD,
          ownerId: owner.id,
          placements: candyIds.map((candy) => ({
            sticker: { candy },
            x: 0.5,
            y: 0.5,
            rotation: 0,
            scale: 1,
          })),
        },
      });

    const stuckOn = async (boardId: string) =>
      (
        (
          await db.halloweenCandyBoard.findUniqueOrThrow({
            where: { id: boardId },
          })
        ).placements as { sticker: { candy?: number } }[]
      ).map((p) => p.sticker.candy);

    it("pays with a spare candy that is not on a board before one that is", async () => {
      const { offer } = await placed(
        alice,
        [(await candy(alice, "candy-corn")).id],
        "banana",
      );
      const onBoard = await candy(bob, "banana", {
        receivedAt: new Date("2026-10-01T00:00:00Z"),
      });
      const loose = await candy(bob, "banana", {
        receivedAt: new Date("2026-10-20T00:00:00Z"),
      });
      await board(bob, [onBoard.id]);

      await gql(ACCEPT, { offerId: offer.id }, bob);

      expect(await ownerOf(loose.id)).toBe(alice.id);
      expect(await ownerOf(onBoard.id)).toBe(bob.id);
    });

    it("takes traded candies off their old owners' boards", async () => {
      const corn = await candy(alice, "candy-corn");
      const kept = await candy(alice, "berry-tart");
      const banana = await candy(bob, "banana");
      const alicesBoard = await board(alice, [corn.id, kept.id]);
      const bobsBoard = await board(bob, [banana.id]);
      const { offer } = await placed(alice, [corn.id], "banana");

      await gql(ACCEPT, { offerId: offer.id }, bob);

      expect(await stuckOn(alicesBoard.id)).toEqual([kept.id]);
      expect(await stuckOn(bobsBoard.id)).toEqual([]);
    });
  });
});
