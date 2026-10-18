import {
  ApplicationCommandOptionType,
  type APIApplicationCommandInteractionDataOption,
} from "@discordjs/core";
import type { HalloweenGuildSettings } from "@chardb/database";
import { Logger } from "@nestjs/common";
import { HalloweenLogEvent } from "../logging";
import { SettingsCommand } from "./settings.command";
import { Color } from "../discord/ui";
import { GuildSettingsService } from "../services/guild-settings.service";
import { DatabaseService } from "../../database/database.service";
import { HalloweenDiscordError, ValidationError } from "../errors";
import {
  ADMINISTRATOR,
  GUILD_ID,
  USER_ID,
  buildInteraction,
} from "../testing/fixtures";
import {
  AUTHOR,
  TIMESTAMP,
  lastReply,
  mockDiscord,
  stubUi,
} from "../testing/command-harness";

const stored: HalloweenGuildSettings = {
  guildId: GUILD_ID,
  resetTime: 6,
  knocksPerDay: 3,
  startDate: new Date("2025-10-01T05:00:00Z"),
  endDate: new Date("2025-11-01T04:59:00Z"),
  winRate: 0.35,
  winChannel: "300000000000000009",
};

const subcommand = (
  name: string,
  options?: APIApplicationCommandInteractionDataOption[],
): APIApplicationCommandInteractionDataOption[] => [
  {
    type: ApplicationCommandOptionType.Subcommand,
    name,
    ...(options ? { options } : {}),
  } as APIApplicationCommandInteractionDataOption,
];

const setOptions = (setting: string, value: string) =>
  subcommand("set", [
    {
      type: ApplicationCommandOptionType.String,
      name: "setting",
      value: setting,
    },
    { type: ApplicationCommandOptionType.String, name: "value", value },
  ]);

describe("/settings", () => {
  let discord: ReturnType<typeof mockDiscord>;
  let guildSettings: {
    get: jest.Mock;
    has: jest.Mock;
    createDefaults: jest.Mock;
    update: jest.Mock;
  };
  let command: SettingsCommand;
  const tx = { tx: true };

  beforeEach(() => {
    discord = mockDiscord();
    guildSettings = {
      get: jest.fn().mockResolvedValue(stored),
      has: jest.fn().mockResolvedValue(true),
      createDefaults: jest.fn().mockResolvedValue(stored),
      update: jest.fn().mockResolvedValue(stored),
    };
    const db = {
      $transaction: jest.fn((fn: (t: unknown) => Promise<unknown>) => fn(tx)),
    } as unknown as DatabaseService;
    command = new SettingsCommand(
      discord,
      stubUi(),
      guildSettings as unknown as GuildSettingsService,
      db,
    );
  });

  const run = (
    options: APIApplicationCommandInteractionDataOption[] | undefined,
    permissions = ADMINISTRATOR,
  ) =>
    command.handle(
      buildInteraction({ name: "settings", options, permissions }),
    );

  describe("routing", () => {
    it("requires a subcommand", async () => {
      await expect(run(undefined)).rejects.toThrow(
        new HalloweenDiscordError({
          thrownFrom: "t",
          message: "No subcommand provided",
        }),
      );
    });

    it("refuses an option that is not a subcommand", async () => {
      await expect(
        run([
          { type: ApplicationCommandOptionType.String, name: "x", value: "y" },
        ]),
      ).rejects.toThrow(
        "No subcommand provided. The settings command requires a subcommand",
      );
    });

    it("refuses an unknown subcommand", async () => {
      await expect(run(subcommand("reset"))).rejects.toThrow(
        "Unknown settings sub command",
      );
    });
  });

  describe("list", () => {
    it("is for administrators only", async () => {
      await expect(run(subcommand("list"), "0")).rejects.toThrow(
        "You lack the required permissions for that command.",
      );
    });

    it("shows every setting", async () => {
      await run(subcommand("list"));
      expect(lastReply(discord)).toEqual({
        embeds: [
          {
            title: "[Admin] Event Settings",
            author: AUTHOR,
            color: Color.Primary,
            timestamp: TIMESTAMP,
            fields: [
              {
                name: "Reset Time (0=midnight-23=11pm) (US Central Daylight Time)",
                value: "6",
              },
              { name: "Knocks Per Day", value: "3" },
              { name: "Win Rate", value: "0.35" },
              { name: "Start Date", value: "2025-10-01 12:00 AM" },
              { name: "End Date", value: "2025-10-31 11:59 PM" },
              { name: "Win Channel", value: "<#300000000000000009>" },
            ],
          },
        ],
      });
    });

    it("shows None for unset values", async () => {
      guildSettings.get.mockResolvedValue({
        ...stored,
        startDate: null,
        endDate: null,
        winChannel: null,
      });
      await run(subcommand("list"));
      const fields = (
        lastReply(discord) as { embeds: { fields: { value: string }[] }[] }
      ).embeds[0].fields;
      expect(fields.slice(3).map((f) => f.value)).toEqual([
        "None",
        "None",
        "None",
      ]);
    });
  });

  describe("set", () => {
    it("is for administrators only", async () => {
      await expect(run(setOptions("knocks_per_day", "3"), "0")).rejects.toThrow(
        "You lack the required permissions for that command.",
      );
    });

    it("requires both a setting and a value", async () => {
      await expect(
        run(
          subcommand("set", [
            {
              type: ApplicationCommandOptionType.String,
              name: "setting",
              value: "win_rate",
            },
          ]),
        ),
      ).rejects.toThrow(
        "Invalid subcommand options. Missing setting or value string options",
      );
    });

    it("refuses an unknown setting", async () => {
      const error = (await run(setOptions("colour", "orange")).catch(
        (e: unknown) => e,
      )) as ValidationError;
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.responseBody(buildInteraction(), stubUi())).toMatchObject({
        content: 'Invalid field: "colour"',
      });
      expect(error.validationErrors).toEqual([
        { field: "setting", error: "Unknown setting" },
      ]);
    });

    it.each([
      ["knocks_per_day", "two"],
      ["reset_time", "-1"],
      ["start_date", "10/01/2025"],
      ["end_date", "2025-10-1"],
      ["win_rate", "half"],
      ["win_channel", "#spooky"],
    ])("refuses a malformed %s", async (setting, value) => {
      const error = (await run(setOptions(setting, value)).catch(
        (e: unknown) => e,
      )) as ValidationError;
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.validationErrors).toEqual([
        { field: setting, error: "Validation failed" },
      ]);
      expect(guildSettings.update).not.toHaveBeenCalled();
    });

    it.each([
      ["knocks_per_day", "4", { knocksPerDay: 4 }],
      ["reset_time", "13", { resetTime: 13 }],
      ["win_rate", "0.25", { winRate: 0.25 }],
      ["win_rate", ".5", { winRate: 0.5 }],
      [
        "win_channel",
        "300000000000000010",
        { winChannel: "300000000000000010" },
      ],
      // Midnight in Chicago: CDT is UTC-5.
      [
        "start_date",
        "2026-10-01",
        { startDate: new Date("2026-10-01T05:00:00Z") },
      ],
      // And CST is UTC-6.
      ["end_date", "2026-11-03", { endDate: new Date("2026-11-03T06:00:00Z") }],
    ])("stores %s %s", async (setting, value, expected) => {
      await run(setOptions(setting, value));
      expect(guildSettings.update).toHaveBeenCalledWith(GUILD_ID, expected, tx);
    });

    it("sets the guild up with defaults the first time", async () => {
      guildSettings.has.mockResolvedValue(false);
      await run(setOptions("knocks_per_day", "4"));
      expect(guildSettings.createDefaults).toHaveBeenCalledWith(GUILD_ID, tx);
      expect(
        guildSettings.createDefaults.mock.invocationCallOrder[0],
      ).toBeLessThan(guildSettings.update.mock.invocationCallOrder[0]);
    });

    it("logs who changed what, from what", async () => {
      const log = jest.spyOn(Logger.prototype, "log").mockImplementation();
      await command.handle(
        buildInteraction({
          id: "ref-1",
          name: "settings",
          options: setOptions("win_rate", "0.25"),
          permissions: ADMINISTRATOR,
        }),
      );
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: HalloweenLogEvent.SettingChanged,
          interactionId: "ref-1",
          guildId: GUILD_ID,
          adminUserId: USER_ID,
          setting: "win_rate",
          oldValue: 0.35,
          newValue: 0.25,
        }),
      );
      log.mockRestore();
    });

    it("logs setting a guild up for the first time", async () => {
      const log = jest.spyOn(Logger.prototype, "log").mockImplementation();
      guildSettings.has.mockResolvedValue(false);
      await command.handle(
        buildInteraction({
          id: "ref-1",
          name: "settings",
          options: setOptions("knocks_per_day", "4"),
          permissions: ADMINISTRATOR,
        }),
      );
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: HalloweenLogEvent.SettingsCreated,
          interactionId: "ref-1",
          guildId: GUILD_ID,
          adminUserId: USER_ID,
        }),
      );
      log.mockRestore();
    });

    it("confirms the change", async () => {
      await run(setOptions("win_rate", "0.25"));
      expect(lastReply(discord)).toEqual({
        embeds: [
          {
            author: AUTHOR,
            timestamp: TIMESTAMP,
            color: Color.Primary,
            description: "Got it. Settings updates will take effect right away",
            fields: [
              { name: "Setting", value: "win_rate" },
              { name: "Value", value: "0.25" },
            ],
          },
        ],
      });
    });

    it("passes on the service's whole-record validation", async () => {
      const invalid = new ValidationError({
        thrownFrom: "t",
        message: "Guild Settings validatiion failed during update",
        validationErrors: [],
      });
      guildSettings.update.mockRejectedValue(invalid);
      await expect(run(setOptions("win_rate", "0.25"))).rejects.toBe(invalid);
      expect(discord.editOriginalResponse).not.toHaveBeenCalled();
    });
  });
});
