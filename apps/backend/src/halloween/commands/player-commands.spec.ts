import {
  ApplicationCommandOptionType,
  type APIApplicationCommandInteractionDataOption,
} from "@discordjs/core";
import { Logger } from "@nestjs/common";
import { HalloweenLogEvent } from "../logging";
import { DeviantArtCommand } from "./deviantart.command";
import { TestWinCommand } from "./testwin.command";
import { GiftyCommand } from "./gifty.command";
import { Color } from "../discord/ui";
import { DeviantArtUserService } from "../services/deviantart-user.service";
import { GuildSettingsService } from "../services/guild-settings.service";
import { GiftyService } from "../services/gifty.service";
import { PlayerLock } from "../services/player-lock";
import { DatabaseService } from "../../database/database.service";
import { Prisma } from "@chardb/database";
import { BusyError, HalloweenDiscordError, ValidationError } from "../errors";
import { LOCKED_TRANSACTION_OPTIONS } from "../services/locked-transaction";
import { MessageFlags } from "@discordjs/core";
import {
  ADMINISTRATOR,
  GUILD_ID,
  OTHER_USER_ID,
  USER_ID,
  buildInteraction,
  buildUserCommandInteraction,
} from "../testing/fixtures";
import {
  AUTHOR,
  TIMESTAMP,
  mockDiscord,
  stubUi,
} from "../testing/command-harness";

describe("/deviantart", () => {
  let deviantArt: { save: jest.Mock };
  let command: DeviantArtCommand;

  beforeEach(() => {
    deviantArt = { save: jest.fn().mockResolvedValue(undefined) };
    command = new DeviantArtCommand(
      stubUi(),
      deviantArt as unknown as DeviantArtUserService,
    );
  });

  const run = (options?: APIApplicationCommandInteractionDataOption[]) =>
    command.handle(buildInteraction({ name: "deviantart", options }));

  it("saves the player's DeviantArt name, and says so privately", async () => {
    const { reply } = await run([
      {
        type: ApplicationCommandOptionType.String,
        name: "da_username",
        value: "provinite",
      },
    ]);
    expect(deviantArt.save).toHaveBeenCalledWith({
      deviantArtName: "provinite",
      guildId: GUILD_ID,
      userId: USER_ID,
    });
    expect(reply).toEqual({
      flags: MessageFlags.Ephemeral,
      embeds: [
        {
          author: AUTHOR,
          timestamp: TIMESTAMP,
          color: Color.Primary,
          title: "Cloverse Halloween 2026 - Setting",
          description:
            "Your DeviantArt name has been saved! You can use the _/deviantart_ command again at any time to update it.",
          fields: [{ name: "DeviantArt Username", value: "provinite" }],
        },
      ],
    });
  });

  it("refuses an empty name without paging staff", async () => {
    const error = (await run([
      {
        type: ApplicationCommandOptionType.String,
        name: "da_username",
        value: "",
      },
    ]).catch((e: unknown) => e)) as HalloweenDiscordError;
    expect(error.message).toBe(
      "Invalid DeviantArt name provided. Must not be empty.",
    );
    expect(error.logAsError).toBe(false);
  });

  it("logs the saved name", async () => {
    const log = jest.spyOn(Logger.prototype, "log").mockImplementation();
    await command.handle(
      buildInteraction({
        id: "ref-1",
        name: "deviantart",
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: "da_username",
            value: "provinite",
          },
        ],
      }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: HalloweenLogEvent.DeviantArtSaved,
        interactionId: "ref-1",
        guildId: GUILD_ID,
        userId: USER_ID,
        deviantArtName: "provinite",
      }),
    );
    log.mockRestore();
  });

  it("requires a name", async () => {
    await expect(run(undefined)).rejects.toThrow(
      "You must provide your deviant art username as an option to this command",
    );
  });

  it("requires the name as text", async () => {
    await expect(
      run([
        {
          type: ApplicationCommandOptionType.Integer,
          name: "da_username",
          value: 4,
        },
      ]),
    ).rejects.toThrow(
      "Invalid option type for DeviantArt username. Expected a string",
    );
  });

  it("refuses an empty name", async () => {
    await expect(
      run([
        {
          type: ApplicationCommandOptionType.String,
          name: "da_username",
          value: "",
        },
      ]),
    ).rejects.toThrow("Invalid DeviantArt name provided. Must not be empty.");
  });

  it("passes on the service's validation", async () => {
    const invalid = new ValidationError({
      thrownFrom: "t",
      message: "DeviantArt username validation failed",
      validationErrors: [],
    });
    deviantArt.save.mockRejectedValue(invalid);
    await expect(
      run([
        {
          type: ApplicationCommandOptionType.String,
          name: "da_username",
          value: "a b",
        },
      ]),
    ).rejects.toBe(invalid);
  });
});

describe("/testwin", () => {
  let discord: ReturnType<typeof mockDiscord>;
  let guildSettings: { get: jest.Mock };
  let command: TestWinCommand;
  let reply: unknown;

  beforeEach(() => {
    discord = mockDiscord();
    guildSettings = {
      get: jest.fn().mockResolvedValue({ winChannel: "300000000000000009" }),
    };
    command = new TestWinCommand(
      discord,
      guildSettings as unknown as GuildSettingsService,
    );
  });

  const run = async (permissions = ADMINISTRATOR) => {
    ({ reply } = await command.handle(
      buildInteraction({ name: "testwin", permissions }),
    ));
  };

  // A player trying an admin command is refused, not a fault to page staff
  // about.
  it("is for administrators only", async () => {
    const error = (await run("0").catch(
      (e: unknown) => e,
    )) as HalloweenDiscordError;
    expect(error.message).toBe(
      "You are missing the required permissions to use this command",
    );
    expect(error.logAsError).toBe(false);
  });

  it("posts a test message to the win channel", async () => {
    await run();
    expect(discord.createChannelMessage).toHaveBeenCalledWith(
      "300000000000000009",
      { content: "Test message" },
    );
    expect(reply).toEqual({ content: "Sent test message." });
  });

  it("logs the test", async () => {
    const log = jest.spyOn(Logger.prototype, "log").mockImplementation();
    await command.handle(
      buildInteraction({
        id: "ref-1",
        name: "testwin",
        permissions: ADMINISTRATOR,
      }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: HalloweenLogEvent.WinChannelTested,
        interactionId: "ref-1",
        adminUserId: USER_ID,
        winChannel: "300000000000000009",
        sent: true,
      }),
    );
    log.mockRestore();
  });

  it("says when there is no win channel", async () => {
    guildSettings.get.mockResolvedValue({ winChannel: null });
    await run();
    expect(discord.createChannelMessage).not.toHaveBeenCalled();
    expect(reply).toEqual({ content: "Win channel isn't set." });
  });
});

describe("/gifty", () => {
  let gifties: { save: jest.Mock };
  let lock: { acquire: jest.Mock };
  let transaction: jest.Mock;
  let command: GiftyCommand;
  const tx = { tx: true };

  beforeEach(() => {
    gifties = { save: jest.fn().mockResolvedValue({ id: 1 }) };
    lock = { acquire: jest.fn().mockResolvedValue(undefined) };
    transaction = jest.fn((fn: (t: unknown) => Promise<unknown>) => fn(tx));
    const db = { $transaction: transaction } as unknown as DatabaseService;
    command = new GiftyCommand(
      stubUi(),
      gifties as unknown as GiftyService,
      lock as unknown as PlayerLock,
      db,
    );
  });

  it("gives up quickly rather than keep Discord waiting", async () => {
    await command.handle(
      buildInteraction({ name: "gifty", options: toUser(OTHER_USER_ID) }),
    );
    expect(transaction).toHaveBeenCalledWith(
      expect.any(Function),
      LOCKED_TRANSACTION_OPTIONS,
    );
  });

  it("answers busy when its locks are not free in time", async () => {
    transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Transaction timed out", {
        code: "P2028",
        clientVersion: "test",
      }),
    );
    await expect(
      command.handle(
        buildInteraction({ name: "gifty", options: toUser(OTHER_USER_ID) }),
      ),
    ).rejects.toBeInstanceOf(BusyError);
  });

  const toUser = (userId: string) =>
    [
      { type: ApplicationCommandOptionType.User, name: "user", value: userId },
    ] as APIApplicationCommandInteractionDataOption[];

  it("sends a gifty with the slash command", async () => {
    const { reply } = await command.handle(
      buildInteraction({ name: "gifty", options: toUser(OTHER_USER_ID) }),
    );
    expect(gifties.save).toHaveBeenCalledWith(
      { guildId: GUILD_ID, fromUserId: USER_ID, toUserId: OTHER_USER_ID },
      { rateLimit: true },
      tx,
    );
    expect(reply).toEqual({
      allowed_mentions: { users: [USER_ID, OTHER_USER_ID] },
      embeds: [
        {
          author: AUTHOR,
          timestamp: TIMESTAMP,
          color: Color.Primary,
          title: "Cloverse Halloween 2026 - New Gifty!",
          description: `<@${USER_ID}> is spreading the love! They just sent a one-time-use extra knock to a lucky friend.`,
          fields: [{ name: "Recipient", value: `<@${OTHER_USER_ID}>` }],
        },
      ],
    });
  });

  it("sends a gifty by right-clicking a member", async () => {
    await command.handle(
      buildUserCommandInteraction({ targetId: OTHER_USER_ID }),
    );
    expect(gifties.save).toHaveBeenCalledWith(
      expect.objectContaining({ toUserId: OTHER_USER_ID }),
      { rateLimit: true },
      tx,
    );
  });

  it("serialises one sender's gifties", async () => {
    await command.handle(
      buildInteraction({ name: "gifty", options: toUser(OTHER_USER_ID) }),
    );
    expect(lock.acquire).toHaveBeenCalledWith(tx, "gifty", GUILD_ID, USER_ID);
    expect(lock.acquire.mock.invocationCallOrder[0]).toBeLessThan(
      gifties.save.mock.invocationCallOrder[0],
    );
  });

  it("logs the gifty", async () => {
    const log = jest.spyOn(Logger.prototype, "log").mockImplementation();
    await command.handle(
      buildInteraction({
        id: "ref-1",
        name: "gifty",
        options: toUser(OTHER_USER_ID),
        permissions: ADMINISTRATOR,
      }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: HalloweenLogEvent.GiftySent,
        interactionId: "ref-1",
        guildId: GUILD_ID,
        fromUserId: USER_ID,
        toUserId: OTHER_USER_ID,
        giftyId: 1,
        rateLimitSkipped: true,
      }),
    );
    log.mockRestore();
  });

  it("logs a refused second gifty", async () => {
    const log = jest.spyOn(Logger.prototype, "log").mockImplementation();
    gifties.save.mockRejectedValue(
      new ValidationError({
        thrownFrom: "t",
        message: "Gifty validation failed",
        validationErrors: [
          { field: "*", error: "Each user may only send one gifty per reset" },
        ],
      }),
    );
    await command.handle(
      buildInteraction({
        id: "ref-1",
        name: "gifty",
        options: toUser(OTHER_USER_ID),
      }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: HalloweenLogEvent.GiftyRateLimited,
        interactionId: "ref-1",
        fromUserId: USER_ID,
        toUserId: OTHER_USER_ID,
      }),
    );
    log.mockRestore();
  });

  it("mentions a self-gifter once", async () => {
    const { reply } = await command.handle(
      buildInteraction({ name: "gifty", options: toUser(USER_ID) }),
    );
    expect(reply).toMatchObject({
      allowed_mentions: { users: [USER_ID] },
    });
  });

  it("lifts the rate limit for administrators", async () => {
    await command.handle(
      buildInteraction({
        name: "gifty",
        options: toUser(OTHER_USER_ID),
        permissions: ADMINISTRATOR,
      }),
    );
    expect(gifties.save).toHaveBeenCalledWith(
      expect.anything(),
      { rateLimit: false },
      tx,
    );
  });

  it("requires a recipient", async () => {
    const error = (await command
      .handle(buildInteraction({ name: "gifty" }))
      .catch((e: unknown) => e)) as HalloweenDiscordError;
    expect(error).toBeInstanceOf(HalloweenDiscordError);
    expect(error.message).toBe("No user specified");
    expect(error.logAsError).toBe(false);
  });

  it("explains the once-per-reset limit", async () => {
    gifties.save.mockRejectedValue(
      new ValidationError({
        thrownFrom: "t",
        message: "Gifty validation failed",
        validationErrors: [
          { field: "*", error: "Each user may only send one gifty per reset" },
        ],
      }),
    );
    const { reply } = await command.handle(
      buildInteraction({
        id: "ref-3",
        name: "gifty",
        options: toUser(OTHER_USER_ID),
      }),
    );
    expect(reply).toEqual({
      embeds: [
        {
          author: AUTHOR,
          timestamp: TIMESTAMP,
          color: Color.Error,
          title: "Cloverse Halloween 2026 - Gifty Already Sent",
          description:
            "You have already sent a gifty since the last reset. Try again soon!",
          footer: { text: "Reference ID: ref-3" },
        },
      ],
    });
  });

  it("passes on any other validation failure", async () => {
    const invalid = new ValidationError({
      thrownFrom: "t",
      message: "Gifty validation failed",
      validationErrors: [{ field: "toUserId", error: "bad" }],
    });
    gifties.save.mockRejectedValue(invalid);
    await expect(
      command.handle(
        buildInteraction({ name: "gifty", options: toUser(OTHER_USER_ID) }),
      ),
    ).rejects.toBe(invalid);
  });
});
