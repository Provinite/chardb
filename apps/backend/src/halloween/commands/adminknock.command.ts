import { Injectable, Logger } from "@nestjs/common";
import {
  ApplicationCommandOptionType,
  type APIApplicationCommandGuildInteraction,
} from "@discordjs/core";
import type {
  HalloweenCommandHandler,
  HalloweenCommandResult,
} from "../discord/halloween-command";
import { HalloweenDiscordError } from "../errors";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import { KnockCommand } from "./knock.command";
import { requireAdministrator, requireChatInput } from "./command-helpers";

/**
 * `/adminknock <user>`: knocks on behalf of a player who cannot use the bot.
 * Spends their knocks and gifties, and the prize is theirs.
 */
@Injectable()
export class AdminKnockCommand implements HalloweenCommandHandler {
  readonly name = "adminknock";

  private readonly logger = new Logger(AdminKnockCommand.name);

  constructor(private readonly knockCommand: KnockCommand) {}

  async handle(
    interaction: APIApplicationCommandGuildInteraction,
  ): Promise<HalloweenCommandResult> {
    const chat = requireChatInput(interaction);
    requireAdministrator(chat, "AdminKnockCommand");

    const [option] = chat.data.options ?? [];
    if (option?.type !== ApplicationCommandOptionType.User) {
      throw new HalloweenDiscordError({
        thrownFrom: "AdminKnockCommand",
        message: "You must provide a target user for the adminknock command",
        sourceError: new Error(
          option
            ? "Got a non-user option in the first slot for /adminknock"
            : "No options provided for /adminknock",
        ),
        // The admin's mistake, not the bot's.
        logAsError: false,
      });
    }

    // The knock's own lines name only the target, so this is the record that
    // an admin did it.
    this.logger.log({
      event: HalloweenLogEvent.AdminKnock,
      message: "Admin knocking for a player",
      interactionId: chat.id,
      guildId: chat.guild_id,
      adminUserId: chat.member.user.id,
      targetUserId: option.value,
    } satisfies HalloweenLogLine);

    return this.knockCommand.knock({
      ...chat,
      data: { ...chat.data, name: this.knockCommand.name },
      member: {
        ...chat.member,
        user: { ...chat.member.user, id: option.value },
      },
    });
  }
}
