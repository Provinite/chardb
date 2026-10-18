import { Injectable } from "@nestjs/common";
import type { APIApplicationCommandGuildInteraction } from "@discordjs/core";
import type { HalloweenCommandHandler } from "../discord/halloween-command";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { HalloweenLinks } from "../halloween-links";
import { movedToChardb } from "./moved-to-chardb";

/**
 * `/settings list` and `/settings set`. The event is set up on chardb now;
 * the command stays registered with Discord until it is removed there, so it
 * tells admins where to go.
 */
@Injectable()
export class SettingsCommand implements HalloweenCommandHandler {
  readonly name = "settings";

  constructor(
    private readonly discord: HalloweenDiscordClient,
    private readonly links: HalloweenLinks,
  ) {}

  async handle(
    interaction: APIApplicationCommandGuildInteraction,
  ): Promise<void> {
    await this.discord.editOriginalResponse(
      interaction.token,
      movedToChardb(
        "Event settings have",
        await this.links.halloweenPage(interaction.guild_id),
      ),
    );
  }
}
