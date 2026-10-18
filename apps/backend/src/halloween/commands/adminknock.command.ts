import { Injectable } from "@nestjs/common";
import {
  ApplicationCommandOptionType,
  type APIApplicationCommandGuildInteraction,
} from "@discordjs/core";
import type { HalloweenCommandHandler } from "../discord/halloween-command";
import { HalloweenDiscordError } from "../errors";
import { KnockCommand } from "./knock.command";
import { requireAdministrator, requireChatInput } from "./command-helpers";

/**
 * `/adminknock <user>`: knocks on behalf of a player who cannot use the bot.
 * Spends their knocks and gifties, and the prize is theirs.
 */
@Injectable()
export class AdminKnockCommand implements HalloweenCommandHandler {
  readonly name = "adminknock";

  constructor(private readonly knockCommand: KnockCommand) {}

  async handle(interaction: APIApplicationCommandGuildInteraction): Promise<void> {
    const chat = requireChatInput(interaction);
    requireAdministrator(chat, "AdminKnockCommand");

    const [option] = chat.data.options ?? [];
    if (option?.type !== ApplicationCommandOptionType.User) {
      throw new HalloweenDiscordError({
        thrownFrom: "AdminKnockCommand",
        message: `You must provide a target user for the ${this.name} command`,
        sourceError: new Error(
          option
            ? `Got a non-user option in the first slot for command ${this.name}`
            : `No interaction options provided for command ${this.name}`,
        ),
      });
    }

    await this.knockCommand.knock({
      ...chat,
      data: { ...chat.data, name: this.knockCommand.name },
      member: {
        ...chat.member,
        user: { ...chat.member.user, id: option.value },
      },
    });
  }
}
