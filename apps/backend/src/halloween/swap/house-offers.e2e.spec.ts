import { HalloweenCandyOfferStatus, NotificationKind } from "@chardb/database";
import { TestApp } from "../../../test/setup-e2e";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../../auth/auth.module";
import { DatabaseService } from "../../database/database.service";
import { Clock } from "../../clock/clock";
import { HalloweenModule } from "../halloween.module";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { mockDiscord } from "../testing/command-harness";
import {
  HOST_CANDIES,
  HOUSE_OFFER_CANDIES,
  MAX_OPEN_HOUSE_OFFERS,
} from "./house-offers";

const GUILD = "100000000000000001";
const MINUTE = 60_000;
const EVENT_START = new Date("2026-10-01T05:00:00Z");
const EVENT_END = new Date("2026-11-01T05:00:00Z");

const OFFER_FIELDS = `id wantSlug status host expiresAt candies { id slug }`;

const BROWSE = `
  query Browse($communityId: ID!, $limit: Int) {
    halloweenCandySwapOffers(communityId: $communityId, limit: $limit) {
      ${OFFER_FIELDS}
    }
  }
`;

const ACCEPT = `
  mutation Accept($communityId: ID!, $offerId: ID!, $giveSlug: String) {
    acceptHalloweenCandyOffer(communityId: $communityId, offerId: $offerId, giveSlug: $giveSlug) {
      id with { username } host gave received
    }
  }
`;

const MY_TRADES = `
  query MyTrades($communityId: ID!) {
    myHalloweenCandyTrades(communityId: $communityId) { id with { username } host gave received }
  }
`;

const DROP = `
  mutation Drop($communityId: ID!, $count: Int!) {
    dropHalloweenHouseOffers(communityId: $communityId, count: $count)
  }
`;

type Player = { id: string; username: string; token: string };
type Offer = {
  id: string;
  wantSlug: string | null;
  status: string;
  host: string | null;
  expiresAt: string | null;
  candies: { id: number; slug: string }[];
};

describe("Halloween house offers (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let communityId: string;
  let alice: Player;
  let manager: Player;
  let now = new Date("2026-10-20T12:00:00Z");
  let knockCount = 0;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup(
      { imports: [DatabaseModule, AuthModule, HalloweenModule] },
      (builder) =>
        builder
          .overrideProvider(HalloweenDiscordClient)
          .useValue(mockDiscord())
          .overrideProvider(Clock)
          .useValue({ now: () => now }),
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

  const advance = (minutes: number) => {
    now = new Date(now.getTime() + minutes * MINUTE);
  };

  beforeEach(async () => {
    now = new Date("2026-10-20T12:00:00Z");
    await testApp.clearDatabase();
    const community = await testApp.createTestCommunity();
    communityId = community.id;
    await db.community.update({
      where: { id: communityId },
      data: { discordGuildId: GUILD, halloweenEnabled: true },
    });
    await db.halloweenGuildSettings.create({
      data: {
        guildId: GUILD,
        resetTime: 6,
        knocksPerDay: 3,
        winRate: 0.4,
        startDate: EVENT_START,
        endDate: EVENT_END,
      },
    });
    alice = await player("alice");
    manager = await player("manager");
    const role = await testApp.createTestRole(communityId, {
      canManageItems: true,
    });
    await testApp.createTestCommunityMember(manager.id, role.id);
  });

  /** A candy owned by `owner`, as a lost knock would leave it. */
  const candy = async (owner: Player, slug: string) => {
    const knock = await db.halloweenKnockEvent.create({
      data: {
        guildId: GUILD,
        userId: `2000000000000${String(++knockCount).padStart(5, "0")}`,
        candySlug: slug,
      },
    });
    return db.halloweenCandy.create({
      data: {
        guildId: GUILD,
        slug,
        knockEventId: knock.id,
        discordUserId: knock.userId,
        ownerId: owner.id,
        receivedAt: now,
      },
    });
  };

  const gql = (query: string, variables: object, who: Player) =>
    testApp.authenticatedGraphqlRequest(
      query,
      { communityId, ...variables },
      who.token,
    );

  const browse = async (who: Player): Promise<Offer[]> => {
    const res = await gql(BROWSE, { limit: 50 }, who);
    expect(res.body.errors).toBeUndefined();
    return res.body.data.halloweenCandySwapOffers as Offer[];
  };

  const houseOffers = () =>
    db.halloweenCandyOffer.findMany({
      where: { guildId: GUILD, host: { not: null } },
      include: { candies: true },
      orderBy: { createdAt: "asc" },
    });

  const openHouseOffers = async () =>
    (await houseOffers()).filter(
      (o) => o.status === HalloweenCandyOfferStatus.OPEN,
    );

  /** Alice holds one spare of every kind, so she can see every offer. */
  const holdEverything = async () => {
    for (const slug of [...HOST_CANDIES.Daphne, ...HOST_CANDIES.Luther]) {
      await candy(alice, slug);
    }
  };

  describe("the lazy top-up", () => {
    it("puts up a house offer of three of the other host's candies for one of the host's own", async () => {
      await holdEverything();

      const offers = await browse(alice);

      expect(offers).toHaveLength(1);
      const [offer] = offers;
      expect(offer.status).toBe("OPEN");
      expect(["Daphne", "Luther"]).toContain(offer.host);
      const host = offer.host as "Daphne" | "Luther";
      const other = host === "Daphne" ? "Luther" : "Daphne";
      expect(HOST_CANDIES[host]).toContain(offer.wantSlug);
      expect(offer.candies).toHaveLength(HOUSE_OFFER_CANDIES);
      for (const c of offer.candies) {
        expect(HOST_CANDIES[other]).toContain(c.slug);
      }
      expect(new Date(offer.expiresAt ?? 0).getTime()).toBe(
        now.getTime() + 100 * MINUTE,
      );

      const minted = await db.halloweenCandy.findMany({
        where: { offerId: offer.id },
      });
      for (const c of minted) {
        expect(c.ownerId).toBeNull();
        expect(c.knockEventId).toBeNull();
        expect(c.discordUserId).toBeNull();
        expect(c.claimedAt).not.toBeNull();
      }
    });

    it("asks only for kinds some player holds a spare of", async () => {
      await candy(alice, "skull-candy");
      await candy(alice, "banana");
      const drop = await testApp.authenticatedGraphqlRequest(
        DROP,
        { communityId, count: 20 },
        manager.token,
      );
      expect(drop.body.errors).toBeUndefined();

      for (const offer of await houseOffers()) {
        expect(offer.wantSlug).toBe(
          offer.host === "Luther" ? "skull-candy" : "banana",
        );
      }
    });

    it("adds one offer per ten minutes, catching up on a quiet stretch", async () => {
      await browse(alice);
      expect(await openHouseOffers()).toHaveLength(1);

      advance(9);
      await browse(alice);
      expect(await openHouseOffers()).toHaveLength(1);

      advance(26);
      await browse(alice);
      expect(await openHouseOffers()).toHaveLength(4);
    });

    it("stops at ten open offers", async () => {
      await browse(alice);
      advance(90);
      await browse(alice);
      expect(await openHouseOffers()).toHaveLength(MAX_OPEN_HOUSE_OFFERS);

      advance(5);
      await browse(alice);
      expect(await openHouseOffers()).toHaveLength(MAX_OPEN_HOUSE_OFFERS);
    });

    it("expires an offer after 100 minutes, and the pool rolls over", async () => {
      await holdEverything();
      await browse(alice);
      const [first] = await openHouseOffers();
      advance(90);
      await browse(alice);
      expect(await openHouseOffers()).toHaveLength(MAX_OPEN_HOUSE_OFFERS);

      advance(10);
      const offers = await browse(alice);

      expect(offers.map((o) => o.id)).not.toContain(first.id);
      expect(await openHouseOffers()).toHaveLength(MAX_OPEN_HOUSE_OFFERS);
      const expired = await db.halloweenCandyOffer.findUniqueOrThrow({
        where: { id: first.id },
        include: { candies: true },
      });
      expect(expired.status).toBe(HalloweenCandyOfferStatus.EXPIRED);
      expect(expired.candies).toEqual([]);
    });

    it("still expires the last offers once the event is over", async () => {
      await holdEverything();
      await browse(alice);
      await db.halloweenGuildSettings.update({
        where: { guildId: GUILD },
        data: { endDate: new Date(now.getTime() + MINUTE) },
      });
      advance(101);

      expect(await browse(alice)).toEqual([]);
      const [offer] = await houseOffers();
      expect(offer.status).toBe(HalloweenCandyOfferStatus.EXPIRED);
      expect(await houseOffers()).toHaveLength(1);
    });

    it("puts up nothing outside the event", async () => {
      now = new Date(EVENT_END.getTime() + 60 * MINUTE);
      await holdEverything();

      expect(await browse(alice)).toEqual([]);
      expect(await houseOffers()).toEqual([]);
    });
  });

  describe("accepting a house offer", () => {
    const putUp = async () => {
      await candy(alice, "skull-candy");
      await candy(alice, "banana");
      const [offer] = await browse(alice);
      return offer;
    };

    it("gives the three candies for one, and the candy paid is gone", async () => {
      const offer = await putUp();
      const payment = await db.halloweenCandy.findFirstOrThrow({
        where: { ownerId: alice.id, slug: offer.wantSlug ?? "" },
      });

      const res = await gql(ACCEPT, { offerId: offer.id }, alice);

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.acceptHalloweenCandyOffer).toMatchObject({
        with: null,
        host: offer.host,
        gave: [offer.wantSlug],
        received: offer.candies.map((c) => c.slug),
      });
      const mine = await db.halloweenCandy.findMany({
        where: { ownerId: alice.id },
      });
      expect(mine).toHaveLength(2 - 1 + HOUSE_OFFER_CANDIES);
      const paid = await db.halloweenCandy.findUniqueOrThrow({
        where: { id: payment.id },
      });
      expect(paid.ownerId).toBeNull();
      expect(paid.offerId).toBeNull();

      const history = await gql(MY_TRADES, {}, alice);
      expect(history.body.data.myHalloweenCandyTrades).toEqual([
        expect.objectContaining({ with: null, host: offer.host }),
      ]);
    });

    it("tells the taker the host traded with them", async () => {
      const offer = await putUp();

      await gql(ACCEPT, { offerId: offer.id }, alice);

      const notes = await db.notification.findMany();
      expect(notes).toEqual([
        expect.objectContaining({
          recipientId: alice.id,
          kind: NotificationKind.HALLOWEEN_CANDY_TRADED,
          actorUserId: null,
          actorLabel: offer.host,
          data: { count: HOUSE_OFFER_CANDIES },
        }),
      ]);
    });

    it("refuses an expired offer", async () => {
      const offer = await putUp();
      advance(101);

      const res = await gql(ACCEPT, { offerId: offer.id }, alice);

      expect(res.body.errors?.[0]?.message).toBe(
        "That offer is no longer open",
      );
    });
  });

  describe("dropping offers by hand", () => {
    const drop = (who: Player, count: number) =>
      testApp.authenticatedGraphqlRequest(DROP, { communityId, count }, who.token);

    it("puts up as many as asked, past the cap", async () => {
      await browse(alice);

      const res = await drop(manager, 15);

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.dropHalloweenHouseOffers).toBe(15);
      expect(await openHouseOffers()).toHaveLength(16);
    });

    it("is for staff who manage items", async () => {
      const res = await drop(alice, 1);

      expect(res.body.errors).toBeDefined();
      expect(await houseOffers()).toEqual([]);
    });

    it("refuses an unreasonable count", async () => {
      expect((await drop(manager, 0)).body.errors).toBeDefined();
      expect((await drop(manager, 51)).body.errors).toBeDefined();
    });
  });
});
