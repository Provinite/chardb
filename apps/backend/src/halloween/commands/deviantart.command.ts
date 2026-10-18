import { Injectable } from "@nestjs/common";
import {
  ApplicationCommandOptionType,
  type APIApplicationCommandGuildInteraction,
} from "@discordjs/core";
import type { HalloweenCommandHandler } from "../discord/halloween-command";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { Color, EVENT_NAME, HalloweenUi } from "../discord/ui";
import { DeviantArtUserService } from "../services/deviantart-user.service";
import { HalloweenDiscordError } from "../errors";
import { requireChatInput } from "./command-helpers";

/**
 * `/deviantart <da_username>`. Its reply is private (see the interactions
 * controller).
 */
@Injectable()
export class DeviantArtCommand implements HalloweenCommandHandler {
  readonly name = "deviantart";

  constructor(
    private readonly discord: HalloweenDiscordClient,
    private readonly ui: HalloweenUi,
    private readonly deviantArtUsers: DeviantArtUserService,
  ) {}

  async handle(interaction: APIApplicationCommandGuildInteraction): Promise<void> {
    const chat = requireChatInput(interaction);
    const { options } = chat.data;
    if (!options || !options.length) {
      throw new HalloweenDiscordError({
        thrownFrom: "DeviantArtCommand",
        message:
          "You must provide your deviant art username as an option to this command",
        sourceError: new Error(
          `No interaction options provided for command ${this.name}`,
        ),
      });
    }
    const [option] = options;
    if (option.type !== ApplicationCommandOptionType.String) {
      throw new HalloweenDiscordError({
        thrownFrom: "DeviantArtCommand",
        message: "Invalid option type for DeviantArt username. Expected a string",
        sourceError: new Error(
          `Got a non-string option in the first slot for command ${this.name}`,
        ),
      });
    }
    const deviantArtName = option.value;
    if (!deviantArtName) {
      throw new HalloweenDiscordError({
        thrownFrom: "DeviantArtCommand",
        message: "Invalid DeviantArt name provided. Must not be empty.",
        sourceError: new Error(
          `Got an empty value for the option in the first slot for command ${this.name}`,
        ),
      });
    }

    await this.deviantArtUsers.save({
      deviantArtName,
      guildId: chat.guild_id,
      userId: chat.member.user.id,
    });

    await this.discord.editOriginalResponse(chat.token, {
      embeds: [
        {
          author: this.ui.author(),
          timestamp: this.ui.timestamp(),
          color: Color.Primary,
          title: `${EVENT_NAME} - Setting`,
          description: `Your DeviantArt name has been saved! You can use the _/${this.name}_ command again at any time to update it.`,
          fields: [{ name: "DeviantArt Username", value: deviantArtName }],
        },
      ],
    });
  }
}
