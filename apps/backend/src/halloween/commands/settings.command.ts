import { Injectable, Logger } from "@nestjs/common";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import {
  ApplicationCommandOptionType,
  type APIApplicationCommandGuildInteraction,
  type APIApplicationCommandInteractionDataSubcommandOption,
  type APIChatInputApplicationCommandGuildInteraction,
} from "@discordjs/core";
import type { HalloweenGuildSettings } from "@chardb/database";
import { DateTime } from "luxon";
import type { HalloweenCommandHandler } from "../discord/halloween-command";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { Color, HalloweenUi } from "../discord/ui";
import { GuildSettingsService } from "../services/guild-settings.service";
import { DatabaseService } from "../../database/database.service";
import { HalloweenDiscordError, ValidationError } from "../errors";
import { EVENT_TIMEZONE, formatChicagoDateUpper } from "../time";
import { requireAdministrator, requireChatInput } from "./command-helpers";

type Settable = Omit<HalloweenGuildSettings, "guildId">;

interface SettingField<K extends keyof Settable> {
  field: K;
  validate: (s: string) => boolean;
  transform: (s: string) => Settable[K];
}

const field = <K extends keyof Settable>(f: SettingField<K>) => f;

const YYYY_MM_DD = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

/** Midnight at the start of that day in Chicago. */
const chicagoMidnight = (s: string): Date => {
  const [year, month, day] = s.split("-").map((n) => Number.parseInt(n, 10));
  return DateTime.fromObject(
    { year, month, day },
    { zone: EVENT_TIMEZONE },
  ).toJSDate();
};

/** The `setting` choices registered with Discord, by value. */
const SETTINGS = {
  knocks_per_day: field({
    field: "knocksPerDay",
    validate: (s) => /^\d+$/.test(s),
    transform: (s) => Number.parseInt(s, 10),
  }),
  start_date: field({
    field: "startDate",
    validate: (s) => YYYY_MM_DD.test(s) && !isNaN(chicagoMidnight(s).getTime()),
    transform: chicagoMidnight,
  }),
  end_date: field({
    field: "endDate",
    validate: (s) => YYYY_MM_DD.test(s) && !isNaN(chicagoMidnight(s).getTime()),
    transform: chicagoMidnight,
  }),
  reset_time: field({
    field: "resetTime",
    validate: (s) => /^\d+$/.test(s),
    transform: (s) => Number.parseInt(s, 10),
  }),
  win_rate: field({
    field: "winRate",
    validate: (s) => /^[0-9]*(\.[0-9]+)?$/.test(s),
    transform: (s) => Number.parseFloat(s),
  }),
  win_channel: field({
    field: "winChannel",
    validate: (s) => /^\d+$/.test(s),
    transform: (s) => s,
  }),
} as const;

const isSetting = (s: string): s is keyof typeof SETTINGS =>
  Object.prototype.hasOwnProperty.call(SETTINGS, s);

/** `/settings list` and `/settings set`, both administrator-only. */
@Injectable()
export class SettingsCommand implements HalloweenCommandHandler {
  readonly name = "settings";
  private readonly logger = new Logger(SettingsCommand.name);

  constructor(
    private readonly discord: HalloweenDiscordClient,
    private readonly ui: HalloweenUi,
    private readonly guildSettings: GuildSettingsService,
    private readonly db: DatabaseService,
  ) {}

  async handle(
    interaction: APIApplicationCommandGuildInteraction,
  ): Promise<void> {
    const chat = requireChatInput(interaction);
    const { options } = chat.data;
    if (!options || !options.length) {
      throw new HalloweenDiscordError({
        thrownFrom: "SettingsCommand",
        message: "No subcommand provided",
        sourceError: new Error(
          "Expected options on settings command, got none.",
        ),
      });
    }
    const [subCommand] = options;
    if (subCommand.type !== ApplicationCommandOptionType.Subcommand) {
      throw new HalloweenDiscordError({
        thrownFrom: "SettingsCommand",
        message:
          "No subcommand provided. The settings command requires a subcommand",
        sourceError: new Error(
          "Expected subcommand, but option was not of type subcommand",
        ),
      });
    }

    switch (subCommand.name.toLowerCase()) {
      case "list":
        return this.list(chat);
      case "set":
        return this.set(chat, subCommand);
      default:
        throw new HalloweenDiscordError({
          thrownFrom: "SettingsCommand",
          message: "Unknown settings sub command",
          sourceError: new Error(
            `No handler found for settings subcommand ${subCommand.name}`,
          ),
        });
    }
  }

  private async list(
    interaction: APIChatInputApplicationCommandGuildInteraction,
  ): Promise<void> {
    requireAdministrator(interaction, "SettingsCommand.list");
    const settings = await this.guildSettings.get(interaction.guild_id);
    await this.discord.editOriginalResponse(interaction.token, {
      embeds: [
        {
          title: "[Admin] Event Settings",
          author: this.ui.author(),
          color: Color.Primary,
          timestamp: this.ui.timestamp(),
          fields: [
            {
              name: "Reset Time (0=midnight-23=11pm) (US Central Daylight Time)",
              value: settings.resetTime.toString(),
            },
            { name: "Knocks Per Day", value: settings.knocksPerDay.toString() },
            { name: "Win Rate", value: settings.winRate.toString() },
            {
              name: "Start Date",
              value: settings.startDate
                ? formatChicagoDateUpper(settings.startDate)
                : "None",
            },
            {
              name: "End Date",
              value: settings.endDate
                ? formatChicagoDateUpper(settings.endDate)
                : "None",
            },
            {
              name: "Win Channel",
              value: settings.winChannel ? `<#${settings.winChannel}>` : "None",
            },
          ],
        },
      ],
    });
  }

  private async set(
    interaction: APIChatInputApplicationCommandGuildInteraction,
    subCommand: APIApplicationCommandInteractionDataSubcommandOption,
  ): Promise<void> {
    requireAdministrator(interaction, "SettingsCommand.set");
    const settingOption = subCommand.options?.find((o) => o.name === "setting");
    const valueOption = subCommand.options?.find((o) => o.name === "value");
    if (
      settingOption?.type !== ApplicationCommandOptionType.String ||
      valueOption?.type !== ApplicationCommandOptionType.String
    ) {
      throw new HalloweenDiscordError({
        thrownFrom: "SettingsCommand.set",
        message:
          "Invalid subcommand options. Missing setting or value string options",
        sourceError: new Error(
          "Invalid subcommand options, 'setting' and 'value' not both found or not both string options",
        ),
      });
    }

    const selected = settingOption.value;
    const value = valueOption.value;
    if (!isSetting(selected)) {
      throw new ValidationError({
        thrownFrom: "SettingsCommand.set",
        message: `Invalid field: "${selected}"`,
        sourceError: new Error(`Unknown setting: ${selected}`),
        validationErrors: [{ field: "setting", error: `Unknown setting` }],
      });
    }

    const setting = SETTINGS[selected];
    if (!setting.validate(value)) {
      throw new ValidationError({
        thrownFrom: "SettingsCommand.set",
        message: "Validation failed when setting settings",
        sourceError: new Error(
          `Transform-level validation failed for field ${selected} on GuildSettings`,
        ),
        validationErrors: [{ error: "Validation failed", field: selected }],
      });
    }

    const change = await this.db.$transaction(async (tx) => {
      const created = !(await this.guildSettings.has(interaction.guild_id, tx));
      const before = created
        ? await this.guildSettings.createDefaults(interaction.guild_id, tx)
        : await this.guildSettings.get(interaction.guild_id, tx);
      const newValue = setting.transform(value);
      await this.guildSettings.update(
        interaction.guild_id,
        { [setting.field]: newValue },
        tx,
      );
      await this.discord.editOriginalResponse(interaction.token, {
        embeds: [
          {
            author: this.ui.author(),
            timestamp: this.ui.timestamp(),
            color: Color.Primary,
            description: "Got it. Settings updates will take effect right away",
            fields: [
              { name: "Setting", value: selected },
              { name: "Value", value },
            ],
          },
        ],
      });
      return { created, oldValue: before[setting.field], newValue };
    });

    // The settings row keeps only the latest values, so these lines are the
    // only history of who changed what.
    const who = {
      interactionId: interaction.id,
      guildId: interaction.guild_id,
      adminUserId: interaction.member.user.id,
    };
    if (change.created) {
      this.logger.log({
        event: HalloweenLogEvent.SettingsCreated,
        message: `Set up the event in guild ${interaction.guild_id} with defaults`,
        ...who,
      } satisfies HalloweenLogLine);
    }
    this.logger.log({
      event: HalloweenLogEvent.SettingChanged,
      message: `Changed ${selected} in guild ${interaction.guild_id}`,
      ...who,
      setting: selected,
      oldValue: change.oldValue,
      newValue: change.newValue,
    } satisfies HalloweenLogLine);
  }
}
