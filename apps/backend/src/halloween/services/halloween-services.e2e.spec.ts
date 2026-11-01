import type { Prisma } from "@chardb/database";
import { TestApp } from "../../../test/setup-e2e";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../../auth/auth.module";
import { DatabaseService } from "../../database/database.service";
import { Clock } from "../../clock/clock";
import { GuildSettingsService } from "./guild-settings.service";
import { PrizeService } from "./prize.service";
import { KnockEventService } from "./knock-event.service";
import { GiftyService } from "./gifty.service";
import { DeviantArtUserService } from "./deviantart-user.service";
import {
  MissingGuildSettingsError,
  ValidationError,
  isGiftyRateLimitError,
} from "../errors";

const GUILD = "100000000000000001";
const ALICE = "200000000000000001";
const BOB = "200000000000000002";

/** 10:30 CDT on 17 Oct 2025; with a 6am reset, the last reset was 11:00Z. */
const NOW = new Date("2025-10-17T15:30:00.000Z");
const BEFORE_RESET = new Date("2025-10-17T10:59:00.000Z");
const AFTER_RESET = new Date("2025-10-17T11:01:00.000Z");

describe("Halloween services (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let settings: GuildSettingsService;
  let prizes: PrizeService;
  let knocks: KnockEventService;
  let gifties: GiftyService;
  let deviantArt: DeviantArtUserService;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      // AuthModule only because TestApp installs the app's global guards.
      imports: [DatabaseModule, AuthModule],
      providers: [
        { provide: Clock, useValue: { now: () => NOW } },
        GuildSettingsService,
        PrizeService,
        KnockEventService,
        GiftyService,
        DeviantArtUserService,
      ],
    });
    const ref = testApp.getModuleRef();
    db = testApp.getDb();
    settings = ref.get(GuildSettingsService);
    prizes = ref.get(PrizeService);
    knocks = ref.get(KnockEventService);
    gifties = ref.get(GiftyService);
    deviantArt = ref.get(DeviantArtUserService);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
  });

  const createSettings = (overrides = {}) =>
    db.halloweenGuildSettings.create({
      data: {
        guildId: GUILD,
        resetTime: 6,
        knocksPerDay: 2,
        winRate: 0.5,
        ...overrides,
      },
    });

  const createPrize = (id: string, overrides = {}) =>
    db.halloweenPrize.create({
      data: {
        guildId: GUILD,
        id,
        name: id,
        initialStock: 3,
        currentStock: 3,
        weight: 10,
        image: "https://i.test/p.png",
        ...overrides,
      },
    });

  describe("GuildSettingsService", () => {
    it("fails loudly when the guild is not set up", async () => {
      await expect(settings.get(GUILD)).rejects.toBeInstanceOf(
        MissingGuildSettingsError,
      );
    });
  });

  describe("PrizeService", () => {
    beforeEach(async () => {
      await createSettings();
    });

    it("lists only prizes still in stock", async () => {
      await createPrize("in-stock");
      await createPrize("gone", { currentStock: 0 });
      const inStock = await prizes.inStock(GUILD);
      expect(inStock.map((p) => p.id)).toEqual(["in-stock"]);
      expect(await prizes.hasInStock(GUILD)).toBe(true);
    });

    it("knows when the pool is empty", async () => {
      await createPrize("gone", { currentStock: 0 });
      expect(await prizes.hasInStock(GUILD)).toBe(false);
    });

    it("decrements a prize's stock", async () => {
      await createPrize("myo");
      const left = await prizes.decrement("myo", GUILD);
      expect(left.currentStock).toBe(2);
    });

    /**
     * A win picks from the whole pool by stock times weight, so it must see
     * every win before it: with stocks of one or two at the end of the event,
     * a stale read would change the odds. One winner at a time holds the
     * guild's in-stock prizes until they commit.
     */
    describe("locking the pool for a win", () => {
      /** A winner's transaction that holds the pool until let go. */
      const holdPool = async (
        onLocked?: (tx: Prisma.TransactionClient) => Promise<void>,
      ) => {
        let release!: () => void;
        const released = new Promise<void>((r) => (release = r));
        let locked!: () => void;
        const isLocked = new Promise<void>((r) => (locked = r));
        const holder = db.$transaction(
          async (tx) => {
            await prizes.lockInStock(GUILD, tx);
            await onLocked?.(tx);
            locked();
            await released;
          },
          { timeout: 10_000 },
        );
        await isLocked;
        return { release, holder };
      };

      it("returns the prizes still in stock", async () => {
        await createPrize("in-stock");
        await createPrize("gone", { currentStock: 0 });
        const pool = await db.$transaction((tx) =>
          prizes.lockInStock(GUILD, tx),
        );
        expect(pool.map((p) => p.id)).toEqual(["in-stock"]);
      });

      it("makes the next winner wait for the one before", async () => {
        await createPrize("myo");
        const { release, holder } = await holdPool();

        let second = false;
        const next = db
          .$transaction((tx) => prizes.lockInStock(GUILD, tx))
          .then(() => (second = true));
        await new Promise((r) => setTimeout(r, 200));
        expect(second).toBe(false);

        release();
        await holder;
        await next;
        expect(second).toBe(true);
      });

      it("shows the next winner the stock the one before left", async () => {
        await createPrize("myo", { currentStock: 1 });
        await createPrize("cat", { currentStock: 2 });
        const { release, holder } = await holdPool(async (tx) => {
          await prizes.decrement("myo", GUILD, tx);
        });

        const next = db.$transaction((tx) => prizes.lockInStock(GUILD, tx));
        release();
        await holder;
        const pool = await next;
        expect(pool.map((p) => [p.id, p.currentStock])).toEqual([["cat", 2]]);
      });
    });
  });

  describe("KnockEventService", () => {
    beforeEach(async () => {
      await createSettings();
      await createPrize("myo");
    });

    const knockAt = (time: Date, userId = ALICE) =>
      db.halloweenKnockEvent.create({
        data: { guildId: GUILD, userId, time },
      });

    it("saves a losing knock with its candy", async () => {
      const knock = await knocks.save({
        guildId: GUILD,
        userId: ALICE,
        prizeId: null,
        candySlug: "candy-corn",
      });
      expect(knock).toMatchObject({
        isPending: false,
        prizeId: null,
        candySlug: "candy-corn",
      });
    });

    it("refuses an invalid knock", async () => {
      await expect(
        knocks.save({
          guildId: GUILD,
          userId: "nope",
          prizeId: null,
          candySlug: null,
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("counts a player's knocks since the last reset", async () => {
      await knockAt(BEFORE_RESET);
      await knockAt(AFTER_RESET);
      await knockAt(AFTER_RESET);
      await knockAt(AFTER_RESET, BOB);
      const guild = await settings.get(GUILD);
      expect(await knocks.countSinceLastReset(guild, ALICE)).toBe(2);
    });

    it("does not count knocks paid for with a gifty", async () => {
      const paid = await knockAt(AFTER_RESET);
      await knockAt(AFTER_RESET);
      await db.halloweenGifty.create({
        data: {
          guildId: GUILD,
          fromUserId: BOB,
          toUserId: ALICE,
          knockEventId: paid.id,
        },
      });
      const guild = await settings.get(GUILD);
      expect(await knocks.countSinceLastReset(guild, ALICE)).toBe(1);
    });

    it("saves a win with its prize", async () => {
      const knock = await knocks.save({
        guildId: GUILD,
        userId: ALICE,
        prizeId: "myo",
        candySlug: null,
      });
      expect(knock).toMatchObject({ isPending: false, prizeId: "myo" });
    });
  });

  describe("GiftyService", () => {
    beforeEach(async () => {
      await createSettings();
    });

    const send = (from = ALICE, to = BOB, rateLimit = true) =>
      gifties.save(
        { guildId: GUILD, fromUserId: from, toUserId: to },
        { rateLimit },
      );

    it("saves a pending gifty", async () => {
      const gifty = await send();
      expect(gifty).toMatchObject({
        fromUserId: ALICE,
        toUserId: BOB,
        knockEventId: null,
      });
    });

    it("allows one gifty per sender per reset", async () => {
      await send();
      const error = (await send(ALICE, ALICE).catch((e: unknown) => e)) as
        | ValidationError
        | undefined;
      expect(error).toBeInstanceOf(ValidationError);
      expect(isGiftyRateLimitError(error as ValidationError)).toBe(true);
    });

    it("allows another gifty after the reset", async () => {
      await db.halloweenGifty.create({
        data: {
          guildId: GUILD,
          fromUserId: ALICE,
          toUserId: BOB,
          time: BEFORE_RESET,
        },
      });
      await expect(send()).resolves.toBeDefined();
    });

    it("lets admins skip the rate limit", async () => {
      await send();
      await expect(send(ALICE, BOB, false)).resolves.toBeDefined();
    });

    it("refuses non-numeric user ids", async () => {
      const error = (await send(ALICE, "bob").catch(
        (e: unknown) => e,
      )) as ValidationError;
      expect(error.validationErrors).toEqual([
        { field: "toUserId", error: "to user id must be a numeric string" },
      ]);
    });

    it("requires the guild to be set up to rate limit", async () => {
      await expect(
        gifties.save(
          { guildId: "999", fromUserId: ALICE, toUserId: BOB },
          { rateLimit: true },
        ),
      ).rejects.toBeInstanceOf(MissingGuildSettingsError);
    });

    it("hands out the oldest pending gifty first, and counts them", async () => {
      const older = await db.halloweenGifty.create({
        data: {
          guildId: GUILD,
          fromUserId: ALICE,
          toUserId: BOB,
          time: BEFORE_RESET,
        },
      });
      await db.halloweenGifty.create({
        data: {
          guildId: GUILD,
          fromUserId: ALICE,
          toUserId: BOB,
          time: AFTER_RESET,
        },
      });
      expect((await gifties.nextPending(GUILD, BOB))?.id).toBe(older.id);
      expect(await gifties.pendingCount(GUILD, BOB)).toBe(2);
    });

    it("spends a gifty on a knock exactly once", async () => {
      const gifty = await send();
      const knock = await knocks.save({
        guildId: GUILD,
        userId: BOB,
        prizeId: null,
        candySlug: "candy-corn",
      });
      const spent = await gifties.fulfill(gifty, knock);
      expect(spent.knockEventId).toBe(knock.id);
      expect(await gifties.pendingCount(GUILD, BOB)).toBe(0);
      const twice = (await gifties
        .fulfill(spent, knock)
        .catch((e: unknown) => e)) as ValidationError;
      expect(twice).toBeInstanceOf(ValidationError);
      expect(twice.details).toEqual({ giftyId: spent.id });
    });
  });

  describe("DeviantArtUserService", () => {
    beforeEach(async () => {
      await createSettings();
    });

    it("saves and replaces a player's DeviantArt name", async () => {
      expect(
        await deviantArt.get({ guildId: GUILD, userId: ALICE }),
      ).toBeNull();
      await deviantArt.save({
        guildId: GUILD,
        userId: ALICE,
        deviantArtName: "first",
      });
      await deviantArt.save({
        guildId: GUILD,
        userId: ALICE,
        deviantArtName: "second-1",
      });
      expect(await deviantArt.get({ guildId: GUILD, userId: ALICE })).toEqual({
        guildId: GUILD,
        userId: ALICE,
        deviantArtName: "second-1",
      });
    });

    it("refuses names DeviantArt would not allow", async () => {
      const error = (await deviantArt
        .save({ guildId: GUILD, userId: ALICE, deviantArtName: "has space" })
        .catch((e: unknown) => e)) as ValidationError;
      expect(error).toBeInstanceOf(ValidationError);
      // The player's typo: refused, not a fault to page staff about.
      expect(error.logAsError).toBe(false);
      expect(error.validationErrors).toEqual([
        {
          field: "deviantArtName",
          error:
            "DeviantArt username is invalid. Must contain only letters, numbers, and hyphens and be less than 30 characters",
        },
      ]);
    });
  });
});
