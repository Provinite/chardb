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
import { DatabaseService } from "../../database/database.service";
import {
  EventEndedError,
  EventNotStartedError,
  OutOfPrizesError,
  TooManyKnocksError,
} from "../errors";
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
  lastReply,
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
    get: jest.Mock;
    eventStatus: jest.Mock;
    lastReset: jest.Mock;
  };
  let prizes: {
    hasInStock: jest.Mock;
    inStock: jest.Mock;
    decrementStock: jest.Mock;
  };
  let knocks: {
    save: jest.Mock;
    countSinceLastReset: jest.Mock;
    fulfillPending: jest.Mock;
  };
  let gifties: {
    nextPending: jest.Mock;
    fulfill: jest.Mock;
    pendingCount: jest.Mock;
  };
  let deviantArt: { get: jest.Mock };
  let award: { validate: jest.Mock; award: jest.Mock };
  let lock: { acquire: jest.Mock };
  let random: HalloweenRandom;
  let db: { $transaction: jest.Mock };
  let command: KnockCommand;

  beforeEach(() => {
    discord = mockDiscord();
    guildSettings = {
      get: jest.fn().mockResolvedValue(settings),
      eventStatus: jest.fn().mockReturnValue(EventStatus.Ongoing),
      lastReset: jest.fn().mockReturnValue(LAST_RESET),
    };
    prizes = {
      hasInStock: jest.fn().mockResolvedValue(true),
      inStock: jest.fn().mockResolvedValue([prize("myo")]),
      decrementStock: jest.fn().mockResolvedValue(undefined),
    };
    knocks = {
      save: jest.fn((k: Partial<HalloweenKnockEvent>) =>
        Promise.resolve(knockEvent({ ...k })),
      ),
      countSinceLastReset: jest.fn().mockResolvedValue(0),
      fulfillPending: jest.fn().mockResolvedValue(undefined),
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
      award: jest.fn().mockResolvedValue(undefined),
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
      lock as unknown as PlayerLock,
      random,
      db as unknown as DatabaseService,
    );
  });

  const knock = (overrides = {}) =>
    command.handle(buildInteraction({ name: "knock", ...overrides }));
  const win = () => (random.unit as jest.Mock).mockReturnValue(0.1);

  describe("before rolling", () => {
    it("works inside one transaction holding the player's lock", async () => {
      await knock();
      expect(lock.acquire).toHaveBeenCalledWith(tx, "knock", GUILD_ID, USER_ID);
      expect(lock.acquire.mock.invocationCallOrder[0]).toBeLessThan(
        guildSettings.get.mock.invocationCallOrder[0],
      );
      expect(guildSettings.get).toHaveBeenCalledWith(GUILD_ID, tx);
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

    it("refuses when every prize is gone", async () => {
      prizes.hasInStock.mockResolvedValue(false);
      await expect(knock()).rejects.toBeInstanceOf(OutOfPrizesError);
      expect(knocks.countSinceLastReset).not.toHaveBeenCalled();
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

  describe("a losing knock", () => {
    it("records the knock and says no one was home", async () => {
      knocks.countSinceLastReset.mockResolvedValue(1);
      gifties.pendingCount.mockResolvedValue(2);
      await knock();
      expect(knocks.save).toHaveBeenCalledWith(
        { guildId: GUILD_ID, userId: USER_ID, prizeId: null },
        tx,
      );
      expect(lastReply(discord)).toEqual({
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
      expect(prizes.inStock).not.toHaveBeenCalled();
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
      expect(lastReply(discord)).toMatchObject({
        allowed_mentions: { users: [OTHER_USER_ID, USER_ID] },
      });
      const fields = (lastReply(discord) as { embeds: Embed[] }).embeds[0]
        .fields;
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
      expect(lastReply(discord)).toMatchObject({
        allowed_mentions: { users: [USER_ID] },
      });
    });
  });

  describe("a winning knock", () => {
    beforeEach(win);

    it("wins when the roll equals the win rate", async () => {
      (random.unit as jest.Mock).mockReturnValue(0.4);
      await knock();
      expect(prizes.inStock).toHaveBeenCalled();
    });

    it("records a pending win, then the prize", async () => {
      await knock();
      expect(knocks.save).toHaveBeenCalledWith(
        { guildId: GUILD_ID, userId: USER_ID, prizeId: null, isPending: true },
        tx,
      );
      expect(prizes.inStock).toHaveBeenCalledWith(GUILD_ID, tx, { lock: true });
      expect(knocks.fulfillPending).toHaveBeenCalledWith(41, "myo", tx);
      expect(prizes.decrementStock).toHaveBeenCalledWith("myo", GUILD_ID, tx);
    });

    it("picks a prize weighted by stock times weight", async () => {
      const pool = [
        prize("a", { currentStock: 1, weight: 10 }),
        prize("b", { currentStock: 4, weight: 5 }),
      ];
      prizes.inStock.mockResolvedValue(pool);
      const weighted = jest.spyOn(random, "weighted");
      await knock();
      expect(weighted).toHaveBeenCalledWith(pool, [10, 20]);
    });

    it("announces the win", async () => {
      knocks.countSinceLastReset
        .mockResolvedValueOnce(1) // before the knock
        .mockResolvedValueOnce(2); // after it
      gifties.pendingCount.mockResolvedValue(1);
      await knock();
      expect(lastReply(discord)).toEqual({
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

    it("links the prize on chardb", async () => {
      prizes.inStock.mockResolvedValue([prize("myo", { itemTypeId: "it-1" })]);
      await knock();
      const fields = (lastReply(discord) as { embeds: Embed[] }).embeds[0]
        .fields;
      expect(fields?.[1]).toEqual({
        name: "CharDB",
        value: "[View on CharDB](https://chardb.cc/item/it-1)",
      });
    });

    it("thanks the gifter", async () => {
      knocks.countSinceLastReset.mockResolvedValue(3);
      gifties.nextPending.mockResolvedValue(gifty());
      await knock();
      const fields = (lastReply(discord) as { embeds: Embed[] }).embeds[0]
        .fields;
      expect(fields).toContainEqual({
        name: "Knock Gifted By",
        value: `<@${OTHER_USER_ID}> (Go thank them!)`,
      });
    });

    it("reminds a winner with no DeviantArt name to set one", async () => {
      deviantArt.get.mockResolvedValue(null);
      await knock();
      expect(deviantArt.get).toHaveBeenCalledWith(
        { guildId: GUILD_ID, userId: USER_ID },
        tx,
      );
      const embeds = (lastReply(discord) as { embeds: unknown[] }).embeds;
      expect(embeds[1]).toEqual({
        author: AUTHOR,
        title: "Reminder",
        description:
          "If you haven't yet, please set your DeviantArt username with the `/deviantart` command",
        color: Color.Warning,
        timestamp: TIMESTAMP,
      });
    });

    it("also announces the win in the win channel, without the reminder", async () => {
      guildSettings.get.mockResolvedValue({
        ...settings,
        winChannel: "300000000000000009",
      });
      deviantArt.get.mockResolvedValue(null);
      await knock();
      const [channel, message] = discord.createChannelMessage.mock.calls[0];
      expect(channel).toBe("300000000000000009");
      expect(message.embeds).toHaveLength(1);
      expect(message.embeds[0].title).toBe("Winner!");
    });

    it("checks the prize can be delivered before announcing it", async () => {
      await knock();
      expect(award.validate).toHaveBeenCalledWith(prize("myo"), GUILD_ID, tx);
      expect(award.validate.mock.invocationCallOrder[0]).toBeLessThan(
        discord.editOriginalResponse.mock.invocationCallOrder[0],
      );
    });

    it("delivers the prize after the knock commits", async () => {
      let committed = false;
      db.$transaction.mockImplementation(
        async (fn: (t: unknown) => Promise<unknown>) => {
          const result = await fn(tx);
          committed = true;
          return result;
        },
      );
      award.award.mockImplementation(() => {
        expect(committed).toBe(true);
        return Promise.resolve();
      });
      await knock();
      expect(award.award).toHaveBeenCalledWith(prize("myo"), USER_ID);
    });

    it("does not undo the win if delivery then fails", async () => {
      award.award.mockRejectedValue(new Error("database blip"));
      await expect(knock()).resolves.toBeUndefined();
    });

    it("fails the whole knock when the last prize went to someone else first", async () => {
      prizes.inStock.mockResolvedValue([]);
      await expect(knock()).rejects.toBeInstanceOf(OutOfPrizesError);
      expect(award.award).not.toHaveBeenCalled();
    });
  });
});

describe("/adminknock", () => {
  const knock = {
    name: "knock",
    knock: jest.fn().mockResolvedValue(undefined),
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

  it("knocks as the target, with their allowance and prizes", async () => {
    const interaction = buildInteraction({
      name: "adminknock",
      permissions: ADMINISTRATOR,
      options: target(OTHER_USER_ID),
    });
    await command.handle(interaction);
    const [asTarget] = knock.knock.mock.calls[0];
    expect(asTarget.member.user.id).toBe(OTHER_USER_ID);
    expect(asTarget.data.name).toBe("knock");
    expect(asTarget.token).toBe(interaction.token);
  });
});
