import { Injectable } from "@nestjs/common";
import {
  ApplicationCommandOptionType,
  type APIApplicationCommandGuildInteraction,
  type APIChatInputApplicationCommandGuildInteraction,
} from "@discordjs/core";
import type {
  HalloweenCommandHandler,
  HalloweenCommandResult,
} from "../discord/halloween-command";
import { HalloweenLinks } from "../halloween-links";
import { HalloweenDiscordError } from "../errors";
import { requireChatInput } from "./command-helpers";
import { movedToChardb } from "./moved-to-chardb";

/**
 * `/prize list` for everyone, which links the prize list on chardb.
 * `/prize admin add` and `edit` stay registered with Discord until they are
 * removed there; prizes are managed on chardb now, so they say where.
 */
@Injectable()
export class PrizeCommand implements HalloweenCommandHandler {
  readonly name = "prize";

  constructor(private readonly links: HalloweenLinks) {}

  async handle(
    interaction: APIApplicationCommandGuildInteraction,
  ): Promise<HalloweenCommandResult> {
    const chat = requireChatInput(interaction);
    const { options } = chat.data;
    if (!options || !options.length) {
      throw new HalloweenDiscordError({
        thrownFrom: "PrizeCommand",
        message: "No subcommand provided",
        sourceError: new Error("Expected options on prize command, got none."),
      });
    }

    let [subCommand] = options;
    let isAdminGroup = false;
    if (
      subCommand.type === ApplicationCommandOptionType.SubcommandGroup &&
      subCommand.name === "admin"
    ) {
      isAdminGroup = true;
      subCommand = subCommand.options[0];
    }
    if (subCommand.type !== ApplicationCommandOptionType.Subcommand) {
      throw new HalloweenDiscordError({
        thrownFrom: "PrizeCommand",
        message:
          "No subcommand provided. The prize command requires a subcommand",
        sourceError: new Error(
          "Expected subcommand, but option was not of type subcommand",
        ),
      });
    }

    const name = subCommand.name.toLowerCase();
    if (isAdminGroup && (name === "add" || name === "edit")) {
      return this.moved(chat);
    }
    if (!isAdminGroup && name === "list") {
      return this.list(chat);
    }
    throw new HalloweenDiscordError({
      thrownFrom: "PrizeCommand",
      message: "Unknown prize sub command",
      sourceError: new Error("No handler found for the prize subcommand"),
      details: { subcommand: name },
    });
  }

  private async moved(
    interaction: APIChatInputApplicationCommandGuildInteraction,
  ): Promise<HalloweenCommandResult> {
    return {
      reply: movedToChardb(
        "Prize management has",
        await this.links.halloweenPage(interaction.guild_id),
      ),
    };
  }

  private async list(
    interaction: APIChatInputApplicationCommandGuildInteraction,
  ): Promise<HalloweenCommandResult> {
    const page = await this.links.prizeListPage(interaction.guild_id);
    return {
      reply: {
        content: page
          ? `See every prize and the latest wins on chardb: ${page}`
          : "See every prize and the latest wins on chardb, under the community's Halloween section.",
      },
    };
  }
}
