import { Injectable } from "@nestjs/common";
import type { APIApplicationCommandGuildInteraction } from "@discordjs/core";
import type {
  HalloweenCommandHandler,
  HalloweenCommandResult,
} from "../discord/halloween-command";
import { Color, EVENT_NAME, HalloweenUi } from "../discord/ui";
import { GuildSettingsService } from "../services/guild-settings.service";
import { formatChicagoDate, formatResetHour } from "../time";
import { requireChatInput } from "./command-helpers";

/** `/info` */
@Injectable()
export class InfoCommand implements HalloweenCommandHandler {
  readonly name = "info";

  constructor(
    private readonly ui: HalloweenUi,
    private readonly guildSettings: GuildSettingsService,
  ) {}

  async handle(
    interaction: APIApplicationCommandGuildInteraction,
  ): Promise<HalloweenCommandResult> {
    requireChatInput(interaction);
    const settings = await this.guildSettings.get(interaction.guild_id);
    return {
      reply: {
        embeds: [
          {
            author: this.ui.author(),
            timestamp: this.ui.timestamp(),
            color: Color.Primary,
            title: `${EVENT_NAME} - Info`,
            description:
              "Event information and settings. These are the current settings" +
              " for the event. Note that they may change over time" +
              " to make sure we give out all of our prizes. All times are in US Central (Chicago) time.",
            fields: [
              {
                name: "Start Date",
                value: settings.startDate
                  ? formatChicagoDate(settings.startDate)
                  : "N/A",
              },
              {
                name: "End Date",
                value: settings.endDate
                  ? formatChicagoDate(settings.endDate)
                  : "N/A",
              },
              {
                name: "Win Rate (per knock)",
                value: settings.winRate * 100 + "%",
              },
              {
                name: "Knocks Per Day",
                value: settings.knocksPerDay.toString(),
              },
              { name: "Prize Pool", value: "/prize list" },
              {
                name: "Reset Time",
                value: formatResetHour(settings.resetTime, this.ui.now()),
              },
            ],
          },
        ],
      },
    };
  }
}
