import {
  ApplicationCommandOptionType,
  type APIApplicationCommandInteractionDataOption,
} from "@discordjs/core";
import type {
  HalloweenGifty,
  HalloweenGuildSettings,
  HalloweenKnockEvent,
  HalloweenPrize,
} from "@chardb/database";
import { Logger } from "@nestjs/common";
import { HalloweenLogEvent } from "../logging";
import { KnockCommand } from "./knock.command";
import { AdminKnockCommand } from "./adminknock.command";
import { Color } from "../discord/ui";
import { HalloweenRandom } from "../random";
import { GuildSettingsService } from "../services/guild-settings.service";
import { PrizeService } from "../services/prize.service";
import { KnockEventService } from "../services/knock-event.service";
import { GiftyService } from "../services/gifty.service";
import { DeviantArtUserService } from "../services/deviantart-user.service";
import { PrizeAwardService } from "../services/prize-award.service";
import { PlayerLock } from "../services/player-lock";
import { PrizeImageService } from "../services/prize-image.service";
import { DatabaseService } from "../../database/database.service";
import { Prisma } from "@chardb/database";
import {
  BusyError,
  EventEndedError,
  EventNotStartedError,
  OutOfPrizesError,
  TooManyKnocksError,
} from "../errors";
import { LOCKED_TRANSACTION_OPTIONS } from "../services/locked-transaction";
import { EventStatus } from "../time";
import {
  ADMINISTRATOR,
  GUILD_ID,
  OTHER_USER_ID,
  USER_ID,
  buildInteraction,
} from "../testing/fixtures";
import {
  AUTHOR,
  CANDY,
  TIMESTAMP,
  mockDiscord,
  stubUi,
} from "../testing/command-harness";

const settings: HalloweenGuildSettings = {
  guildId: GUILD_ID,
  resetTime: 6,
  knocksPerDay: 3,
  startDate: new Date("2025-10-01T05:00:00Z"),
  endDate: null,
  winRate: 0.4,
  winChannel: null,
};

const LAST_RESET = new Date("2025-10-17T11:00:00Z");

const prize = (
  id: string,
  overrides: Partial<HalloweenPrize> = {},
): HalloweenPrize => ({
  guildId: GUILD_ID,
  id,
  name: `Prize ${id}`,
  initialStock: 5,
  currentStock: 5,
  weight: 10,
  image: `https://i.test/${id}.png`,
  itemTypeId: null,
  characterId: null,
  ...overrides,
});

const knockEvent = (
  overrides: Partial<HalloweenKnockEvent> = {},
): HalloweenKnockEvent => ({
  id: 41,
  guildId: GUILD_ID,
  userId: USER_ID,
  prizeId: null,
  deliveredAt: null,
  deliveredById: null,
  time: new Date(TIMESTAMP),
  isPending: false,
  ...overrides,
});

const gifty = (overrides: Partial<HalloweenGifty> = {}): HalloweenGifty => ({
  id: 7,
  guildId: GUILD_ID,
  time: new Date("2025-10-16T00:00:00Z"),
  fromUserId: OTHER_USER_ID,
  toUserId: USER_ID,
  knockEventId: null,
  ...overrides,
});

interface Embed {
  title?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
}

describe("/knock", () => {
  const tx = { tx: true };
  let discord: ReturnType<typeof mockDiscord>;
  let guildSettings: {
    getCached: jest.Mock;
    eventStatus: jest.Mock;
    lastReset: jest.Mock;
  };
  let prizes: {
    hasInStock: jest.Mock;
    lockInStock: jest.Mock;
    decrement: jest.Mock;
  };
  let knocks: {
    save: jest.Mock;
    countSinceLastReset: jest.Mock;
  };
  let gifties: {
    nextPending: jest.Mock;
    fulfill: jest.Mock;
    pendingCount: jest.Mock;
  };
  let deviantArt: { get: jest.Mock };
  let award: { validate: jest.Mock; grant: jest.Mock };
  let images: { imageFor: jest.Mock };
  let lock: { acquire: jest.Mock };
  let random: HalloweenRandom;
  let db: { $transaction: jest.Mock };
  let command: KnockCommand;

  beforeEach(() => {
    discord = mockDiscord();
    guildSettings = {
      getCached: jest.fn().mockResolvedValue(settings),
      eventStatus: jest.fn().mockReturnValue(EventStatus.Ongoing),
      lastReset: jest.fn().mockReturnValue(LAST_RESET),
    };
    prizes = {
      hasInStock: jest.fn().mockResolvedValue(true),
      lockInStock: jest.fn().mockResolvedValue([prize("myo")]),
      // The pool's prize, less the one the winner took.
      decrement: jest.fn(async (id: string) => {
        const pool: HalloweenPrize[] =
          await prizes.lockInStock.mock.results.at(-1)?.value;
        const taken = pool.find((p) => p.id === id) ?? prize(id);
        return { ...taken, currentStock: taken.currentStock - 1 };
      }),
    };
    knocks = {
      save: jest.fn((k: Partial<HalloweenKnockEvent>) =>
        Promise.resolve(knockEvent({ ...k })),
      ),
      countSinceLastReset: jest.fn().mockResolvedValue(0),
    };
    gifties = {
      nextPending: jest.fn().mockResolvedValue(null),
      fulfill: jest.fn((g: HalloweenGifty, k: HalloweenKnockEvent) =>
        Promise.resolve({ ...g, knockEventId: k.id }),
      ),
      pendingCount: jest.fn().mockResolvedValue(0),
    };
    deviantArt = {
      get: jest.fn().mockResolvedValue({ deviantArtName: "someone" }),
    };
    award = {
      validate: jest.fn().mockResolvedValue(undefined),
      grant: jest.fn().mockResolvedValue(undefined),
    };
    images = {
      imageFor: jest.fn((p: HalloweenPrize) => Promise.resolve(p.image)),
    };
    lock = { acquire: jest.fn().mockResolvedValue(undefined) };
    random = new HalloweenRandom();
    jest.spyOn(random, "unit").mockReturnValue(0.99); // a loss
    jest.spyOn(random, "int").mockReturnValue(0);
    db = {
      $transaction: jest.fn((fn: (t: unknown) => Promise<unknown>) => fn(tx)),
    };
    command = new KnockCommand(
      discord,
      stubUi(),
      guildSettings as unknown as GuildSettingsService,
      prizes as unknown as PrizeService,
      knocks as unknown as KnockEventService,
      gifties as unknown as GiftyService,
      deviantArt as unknown as DeviantArtUserService,
      award as unknown as PrizeAwardService,
      images as unknown as PrizeImageService,
      lock as unknown as PlayerLock,
      random,
      db as unknown as DatabaseService,
    );
  });

  /** What the last knock answered with. */
  let reply: unknown;
  /** The command alone, as the dispatcher runs it before replying. */
  const knockOnly = async (overrides = {}) => {
    const result = await command.handle(
      buildInteraction({ name: "knock", ...overrides }),
    );
    reply = result.reply;
    return result;
  };
  /** The command, then what it left for after the reply. */
  const knock = async (overrides = {}) => {
    const result = await knockOnly(overrides);
    await result.afterReply?.();
    return result;
  };
  const win = () => (random.unit as jest.Mock).mockReturnValue(0.1);

  describe("staying inside Discord's three seconds", () => {
    it("gives up quickly rather than keep Discord waiting", async () => {
      await knock();
      expect(db.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        LOCKED_TRANSACTION_OPTIONS,
      );
    });

    it("answers busy when its locks are not free in time", async () => {
      db.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Transaction timed out", {
          code: "P2028",
          clientVersion: "test",
        }),
      );
      await expect(knock()).rejects.toBeInstanceOf(BusyError);
    });

    it("makes no Discord call inside the transaction", async () => {
      win();
      guildSettings.getCached.mockResolvedValue({
        ...settings,
        winChannel: "300000000000000009",
      });
      db.$transaction.mockImplementation(
        async (fn: (t: unknown) => Promise<unknown>) => {
          const result = await fn(tx);
          expect(discord.createChannelMessage).not.toHaveBeenCalled();
          return result;
        },
      );
      await knock();
      expect(discord.createChannelMessage).toHaveBeenCalled();
    });
  });

  describe("before rolling", () => {
    it("reads the guild's cached settings, outside any transaction", async () => {
      await knock();
      expect(guildSettings.getCached).toHaveBeenCalledWith(GUILD_ID);
      expect(guildSettings.getCached.mock.invocationCallOrder[0]).toBeLessThan(
        db.$transaction.mock.invocationCallOrder[0],
      );
    });

    it("holds the player's lock before reading their allowance", async () => {
      await knock();
      expect(lock.acquire).toHaveBeenCalledWith(tx, "knock", GUILD_ID, USER_ID);
      expect(lock.acquire.mock.invocationCallOrder[0]).toBeLessThan(
        knocks.countSinceLastReset.mock.invocationCallOrder[0],
      );
    });

    it("rolls before opening a transaction", async () => {
      await knock();
      expect(
        (random.unit as jest.Mock).mock.invocationCallOrder[0],
      ).toBeLessThan(db.$transaction.mock.invocationCallOrder[0]);
    });

    it("refuses once the event is over", async () => {
      guildSettings.eventStatus.mockReturnValue(EventStatus.Ended);
      await expect(knock()).rejects.toBeInstanceOf(EventEndedError);
      expect(knocks.save).not.toHaveBeenCalled();
    });

    it("refuses before the event starts", async () => {
      guildSettings.eventStatus.mockReturnValue(EventStatus.NotStartedYet);
      await expect(knock()).rejects.toBeInstanceOf(EventNotStartedError);
    });

    it("refuses when every prize is gone, before opening a transaction", async () => {
      prizes.hasInStock.mockResolvedValue(false);
      await expect(knock()).rejects.toBeInstanceOf(OutOfPrizesError);
      expect(prizes.hasInStock).toHaveBeenCalledWith(GUILD_ID);
      expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("refuses a player out of knocks and gifties", async () => {
      knocks.countSinceLastReset.mockResolvedValue(3);
      const error = (await knock().catch(
        (e: unknown) => e,
      )) as TooManyKnocksError;
      expect(error).toBeInstanceOf(TooManyKnocksError);
      expect(
        (error.responseBody(buildInteraction(), stubUi()).embeds ?? [])[0]
          .fields,
      ).toEqual([
        { name: "Knocks Per Day", value: "3" },
        { name: "Reset Time", value: "6 AM US Central Time" },
        { name: "Last Reset Time", value: "2025-10-17 6:00:00 AM" },
      ]);
      expect(knocks.save).not.toHaveBeenCalled();
    });
  });

  describe("logging", () => {
    let log: jest.SpyInstance;
    let error: jest.SpyInstance;
    const interaction = { id: "ref-1" };

    beforeEach(() => {
      log = jest.spyOn(Logger.prototype, "log").mockImplementation();
      error = jest.spyOn(Logger.prototype, "error").mockImplementation();
    });

    afterEach(() => jest.restoreAllMocks());

    // Before any knock is spent, so a roll can be logged for a knock that was
    // then refused.
    it("logs the roll", async () => {
      await knock(interaction);
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: HalloweenLogEvent.KnockRolled,
          interactionId: "ref-1",
          guildId: GUILD_ID,
          userId: USER_ID,
          roll: 0.99,
          winRate: 0.4,
          win: false,
        }),
      );
    });

    it("logs a loss with its knock record", async () => {
      knocks.countSinceLastReset.mockResolvedValue(3);
      gifties.nextPending.mockResolvedValue(gifty());
      await knock(interaction);
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: HalloweenLogEvent.KnockLost,
          interactionId: "ref-1",
          knockEventId: 41,
          knocksUsed: 3,
          knocksPerDay: 3,
          giftyId: 7,
          giftyFrom: OTHER_USER_ID,
        }),
      );
    });

    it("logs what a win gave and what is left", async () => {
      win();
      knocks.countSinceLastReset.mockResolvedValue(1);
      prizes.lockInStock.mockResolvedValue([
        prize("myo", { itemTypeId: "it-1" }),
      ]);
      prizes.decrement.mockResolvedValue(
        prize("myo", { itemTypeId: "it-1", currentStock: 4 }),
      );
      await knock(interaction);
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: HalloweenLogEvent.KnockWon,
          interactionId: "ref-1",
          guildId: GUILD_ID,
          userId: USER_ID,
          knockEventId: 41,
          prizeId: "myo",
          prizeName: "Prize myo",
          stockRemaining: 4,
          itemTypeId: "it-1",
          characterId: null,
          giftyId: null,
          knocksUsed: 1,
          knocksPerDay: 3,
        }),
      );
    });

    // How close a knock came to Discord's three seconds, and how long winners
    // queued for the pool and held it.
    it("logs how long the knock took, and its wait for and hold of the pool", async () => {
      win();
      await knock(interaction);
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: HalloweenLogEvent.KnockWon,
          transactionMs: expect.any(Number),
          prizeLockWaitMs: expect.any(Number),
          prizeLockHeldMs: expect.any(Number),
        }),
      );
    });

    it("logs how long a lost knock took", async () => {
      await knock(interaction);
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: HalloweenLogEvent.KnockLost,
          transactionMs: expect.any(Number),
        }),
      );
    });

    it("logs a failed image lookup, and still shows the win", async () => {
      win();
      images.imageFor.mockRejectedValue(new Error("database blip"));
      await knock(interaction);
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: HalloweenLogEvent.PrizeImageLookupFailed,
          interactionId: "ref-1",
          prizeId: "myo",
          cause: "database blip",
        }),
        expect.stringContaining("database blip"),
      );
      const [embed] = (reply as { embeds: object[] }).embeds;
      expect(embed).toMatchObject({ title: "Winner!" });
      expect(embed).not.toHaveProperty("image");
    });
  });

  describe("a losing knock", () => {
    it("records the knock and says no one was home", async () => {
      knocks.countSinceLastReset.mockResolvedValue(1);
      gifties.pendingCount.mockResolvedValue(2);
      await knock();
      expect(knocks.save).toHaveBeenCalledWith(
        { guildId: GUILD_ID, userId: USER_ID, prizeId: null },
        tx,
      );
      expect(reply).toEqual({
        allowed_mentions: { users: [USER_ID] },
        embeds: [
          {
            title: "No one was home",
            description:
              "You knocked and knocked but no one was home. Tricks this time.",
            fields: [
              { name: "Remaining Knocks", value: "1", inline: true },
              { name: "Banked Gifties", value: "2", inline: true },
              { name: "Trick or Treater", value: `<@${USER_ID}>` },
            ],
            author: AUTHOR,
            timestamp: TIMESTAMP,
            color: Color.Primary,
            image: { url: CANDY },
            footer: { text: "Come back soon!" },
          },
        ],
      });
    });

    it("loses when the roll is above the win rate", async () => {
      (random.unit as jest.Mock).mockReturnValue(0.41);
      await knock();
      expect(prizes.lockInStock).not.toHaveBeenCalled();
    });

    it("spends a gifty once the day's knocks are gone", async () => {
      knocks.countSinceLastReset.mockResolvedValue(3);
      gifties.nextPending.mockResolvedValue(gifty());
      await knock();
      expect(gifties.nextPending).toHaveBeenCalledWith(GUILD_ID, USER_ID, tx);
      expect(gifties.fulfill).toHaveBeenCalledWith(
        gifty(),
        expect.objectContaining({ id: 41 }),
        tx,
      );
      expect(reply).toMatchObject({
        allowed_mentions: { users: [OTHER_USER_ID, USER_ID] },
      });
      const fields = (reply as { embeds: Embed[] }).embeds[0].fields;
      expect(fields?.[0]).toEqual({
        name: "Knock Gifted By",
        value: `<@${OTHER_USER_ID}>`,
      });
      expect(fields?.[1]).toEqual({
        name: "Remaining Knocks",
        value: "0",
        inline: true,
      });
    });

    it("mentions a self-gifter once", async () => {
      knocks.countSinceLastReset.mockResolvedValue(3);
      gifties.nextPending.mockResolvedValue(
        gifty({ fromUserId: USER_ID, toUserId: USER_ID }),
      );
      await knock();
      expect(reply).toMatchObject({
        allowed_mentions: { users: [USER_ID] },
      });
    });
  });

  describe("a winning knock", () => {
    beforeEach(win);

    it("wins when the roll equals the win rate", async () => {
      (random.unit as jest.Mock).mockReturnValue(0.4);
      await knock();
      expect(prizes.lockInStock).toHaveBeenCalled();
    });

    it("locks the pool, takes one of the prize, then records the win with it", async () => {
      await knock();
      expect(prizes.lockInStock).toHaveBeenCalledWith(GUILD_ID, tx);
      expect(prizes.decrement).toHaveBeenCalledWith("myo", GUILD_ID, tx);
      expect(knocks.save).toHaveBeenCalledTimes(1);
      expect(knocks.save).toHaveBeenCalledWith(
        { guildId: GUILD_ID, userId: USER_ID, prizeId: "myo" },
        tx,
      );
    });

    // Everything that does not depend on the prize happens first, so a winner
    // holds the pool, which every other winner waits on, as briefly as it can.
    it("takes the pool only after the player's lock and allowance", async () => {
      knocks.countSinceLastReset.mockResolvedValue(3);
      gifties.nextPending.mockResolvedValue(gifty());
      await knock();
      const pool = prizes.lockInStock.mock.invocationCallOrder[0];
      expect(lock.acquire.mock.invocationCallOrder[0]).toBeLessThan(pool);
      expect(
        knocks.countSinceLastReset.mock.invocationCallOrder[0],
      ).toBeLessThan(pool);
      expect(gifties.nextPending.mock.invocationCallOrder[0]).toBeLessThan(
        pool,
      );
    });

    it("leaves the knock unspent when the pool emptied before its turn", async () => {
      prizes.lockInStock.mockResolvedValue([]);
      await expect(knock()).rejects.toBeInstanceOf(OutOfPrizesError);
      expect(prizes.decrement).not.toHaveBeenCalled();
      expect(award.grant).not.toHaveBeenCalled();
    });

    it("picks a prize weighted by stock times weight", async () => {
      const pool = [
        prize("a", { currentStock: 1, weight: 10 }),
        prize("b", { currentStock: 4, weight: 5 }),
      ];
      prizes.lockInStock.mockResolvedValue(pool);
      const weighted = jest.spyOn(random, "weighted");
      await knock();
      expect(weighted).toHaveBeenCalledWith(pool, [10, 20]);
    });

    it("announces the win", async () => {
      knocks.countSinceLastReset.mockResolvedValue(1); // before this one
      gifties.pendingCount.mockResolvedValue(1);
      await knock();
      expect(reply).toEqual({
        allowed_mentions: { users: [USER_ID] },
        embeds: [
          {
            author: AUTHOR,
            title: "Winner!",
            description: "You won! Congratulations on your lovely new prize!",
            image: { url: "https://i.test/myo.png" },
            color: Color.Primary,
            fields: [
              { name: "Prize", value: "Prize myo" },
              { name: "Remaining Knocks", value: "1", inline: true },
              { name: "Banked Gifties", value: "1", inline: true },
              { name: "Winner", value: `<@${USER_ID}>` },
            ],
            timestamp: TIMESTAMP,
          },
        ],
      });
    });

    it("shows a chardb prize's own image", async () => {
      const candy = prize("candy", { image: null, itemTypeId: "it-1" });
      prizes.lockInStock.mockResolvedValue([candy]);
      images.imageFor.mockResolvedValue("https://cdn.test/candy.webp");
      await knock();
      expect(images.imageFor).toHaveBeenCalledWith(
        expect.objectContaining({ id: candy.id, itemTypeId: "it-1" }),
      );
      const [embed] = (reply as { embeds: { image?: unknown }[] }).embeds;
      expect(embed.image).toEqual({ url: "https://cdn.test/candy.webp" });
    });

    // A lookup of its own, outside the transaction that holds the prize row.
    it("looks up the image only once the win has committed", async () => {
      db.$transaction.mockImplementation(
        async (fn: (t: unknown) => Promise<unknown>) => {
          const result = await fn(tx);
          expect(images.imageFor).not.toHaveBeenCalled();
          return result;
        },
      );
      await knock();
      expect(images.imageFor).toHaveBeenCalled();
    });

    it("leaves the image out when the prize has none to show", async () => {
      prizes.lockInStock.mockResolvedValue([
        prize("candy", { image: null, itemTypeId: "it-1" }),
      ]);
      images.imageFor.mockResolvedValue(null);
      await knock();
      const [embed] = (reply as { embeds: object[] }).embeds;
      expect(embed).not.toHaveProperty("image");
    });

    it("links the prize on chardb", async () => {
      prizes.lockInStock.mockResolvedValue([
        prize("myo", { itemTypeId: "it-1" }),
      ]);
      await knock();
      const fields = (reply as { embeds: Embed[] }).embeds[0].fields;
      expect(fields?.[1]).toEqual({
        name: "CharDB",
        value: "[View on CharDB](https://chardb.cc/item/it-1)",
      });
    });

    it("thanks the gifter", async () => {
      knocks.countSinceLastReset.mockResolvedValue(3);
      gifties.nextPending.mockResolvedValue(gifty());
      await knock();
      const fields = (reply as { embeds: Embed[] }).embeds[0].fields;
      expect(fields).toContainEqual({
        name: "Knock Gifted By",
        value: `<@${OTHER_USER_ID}> (Go thank them!)`,
      });
    });

    it("reminds a winner with no DeviantArt name to set one", async () => {
      deviantArt.get.mockResolvedValue(null);
      await knock();
      // After the commit: a reply detail, not something to hold the pool for.
      expect(deviantArt.get).toHaveBeenCalledWith({
        guildId: GUILD_ID,
        userId: USER_ID,
      });
      const embeds = (reply as { embeds: unknown[] }).embeds;
      expect(embeds[1]).toEqual({
        author: AUTHOR,
        title: "Reminder",
        description:
          "If you haven't yet, please set your DeviantArt username with the `/deviantart` command",
        color: Color.Warning,
        timestamp: TIMESTAMP,
      });
    });

    it("also announces the win in the win channel, after the reply, without the reminder", async () => {
      guildSettings.getCached.mockResolvedValue({
        ...settings,
        winChannel: "300000000000000009",
      });
      deviantArt.get.mockResolvedValue(null);
      const { afterReply } = await knockOnly();
      expect(discord.createChannelMessage).not.toHaveBeenCalled();
      await afterReply?.();
      const [channel, message] = discord.createChannelMessage.mock.calls[0];
      expect(channel).toBe("300000000000000009");
      expect(message.embeds).toHaveLength(1);
      expect(message.embeds[0].title).toBe("Winner!");
    });

    it("keeps the win when the win channel post fails, and logs it", async () => {
      const error = jest.spyOn(Logger.prototype, "error").mockImplementation();
      guildSettings.getCached.mockResolvedValue({
        ...settings,
        winChannel: "300000000000000009",
      });
      discord.createChannelMessage.mockRejectedValue(
        new Error("Missing Access"),
      );
      prizes.lockInStock.mockResolvedValue([
        prize("myo", { itemTypeId: "it-1" }),
      ]);
      await expect(knock({ id: "ref-2" })).resolves.toBeDefined();
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: HalloweenLogEvent.WinChannelPostFailed,
          interactionId: "ref-2",
          winChannel: "300000000000000009",
          prizeId: "myo",
          cause: "Missing Access",
        }),
        expect.stringContaining("Missing Access"),
      );
      error.mockRestore();
    });

    it("checks the prize can be delivered before taking it", async () => {
      await knock();
      expect(award.validate).toHaveBeenCalledWith(prize("myo"), GUILD_ID, tx);
      expect(award.validate.mock.invocationCallOrder[0]).toBeLessThan(
        prizes.decrement.mock.invocationCallOrder[0],
      );
    });

    it("grants the prize inside the knock, with what was taken", async () => {
      const candy = prize("myo", { itemTypeId: "it-1" });
      prizes.lockInStock.mockResolvedValue([candy]);
      db.$transaction.mockImplementation(
        async (fn: (t: unknown) => Promise<unknown>) => {
          const result = await fn(tx);
          expect(award.grant).toHaveBeenCalledWith(
            { ...candy, currentStock: 4 },
            USER_ID,
            tx,
          );
          return result;
        },
      );
      await knock();
    });

    it("leaves nothing for after the reply without a win channel", async () => {
      prizes.lockInStock.mockResolvedValue([
        prize("myo", { itemTypeId: "it-1" }),
      ]);
      const { afterReply } = await knockOnly();
      expect(afterReply).toBeUndefined();
    });

    // The whole knock rolls back, so the player keeps it.
    it("fails the knock when the grant fails", async () => {
      prizes.lockInStock.mockResolvedValue([
        prize("myo", { itemTypeId: "it-1" }),
      ]);
      award.grant.mockRejectedValue(new Error("database blip"));
      await expect(knock()).rejects.toThrow("database blip");
    });
  });
});

describe("/adminknock", () => {
  const knocked = { reply: { content: "knocked" } };
  const knock = {
    name: "knock",
    knock: jest.fn().mockResolvedValue(knocked),
  };
  const command = new AdminKnockCommand(knock as unknown as KnockCommand);
  const target = (userId: string) =>
    [
      { type: ApplicationCommandOptionType.User, name: "user", value: userId },
    ] as APIApplicationCommandInteractionDataOption[];

  beforeEach(() => knock.knock.mockClear());

  it("is for administrators only", async () => {
    await expect(
      command.handle(
        buildInteraction({
          name: "adminknock",
          options: target(OTHER_USER_ID),
        }),
      ),
    ).rejects.toThrow("You lack the required permissions for that command.");
  });

  it("requires a target user", async () => {
    await expect(
      command.handle(
        buildInteraction({ name: "adminknock", permissions: ADMINISTRATOR }),
      ),
    ).rejects.toThrow(
      "You must provide a target user for the adminknock command",
    );
    await expect(
      command.handle(
        buildInteraction({
          name: "adminknock",
          permissions: ADMINISTRATOR,
          options: [
            {
              type: ApplicationCommandOptionType.String,
              name: "user",
              value: "x",
            },
          ],
        }),
      ),
    ).rejects.toThrow(
      "You must provide a target user for the adminknock command",
    );
  });

  it("logs who knocked for whom", async () => {
    const log = jest.spyOn(Logger.prototype, "log").mockImplementation();
    await command.handle(
      buildInteraction({
        id: "ref-1",
        name: "adminknock",
        permissions: ADMINISTRATOR,
        options: target(OTHER_USER_ID),
      }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: HalloweenLogEvent.AdminKnock,
        interactionId: "ref-1",
        guildId: GUILD_ID,
        adminUserId: USER_ID,
        targetUserId: OTHER_USER_ID,
      }),
    );
    log.mockRestore();
  });

  it("knocks as the target, with their allowance and prizes", async () => {
    const interaction = buildInteraction({
      name: "adminknock",
      permissions: ADMINISTRATOR,
      options: target(OTHER_USER_ID),
    });
    await expect(command.handle(interaction)).resolves.toBe(knocked);
    const [asTarget] = knock.knock.mock.calls[0];
    expect(asTarget.member.user.id).toBe(OTHER_USER_ID);
    expect(asTarget.data.name).toBe("knock");
    expect(asTarget.token).toBe(interaction.token);
  });
});
