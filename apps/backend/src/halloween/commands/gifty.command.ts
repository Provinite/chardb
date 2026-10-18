import { Injectable } from "@nestjs/common";
import {
  ApplicationCommandOptionType,
  type APIApplicationCommandGuildInteraction,
} from "@discordjs/core";
import type { HalloweenCommandHandler } from "../discord/halloween-command";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { Color, EVENT_NAME, HalloweenUi } from "../discord/ui";
import { GiftyService } from "../services/gifty.service";
import { PlayerLock } from "../services/player-lock";
import { DatabaseService } from "../../database/database.service";
import {
  HalloweenDiscordError,
  ValidationError,
  isGiftyRateLimitError,
} from "../errors";
import { isAdministrator, isChatInput, isUserCommand } from "./command-helpers";

/**
 * `/gifty <user>`, or "gifty" from a member's right-click menu: gives them one
 * extra knock. Once per reset, except for administrators.
 */
@Injectable()
export class GiftyCommand implements HalloweenCommandHandler {
  readonly name = "gifty";

  constructor(
    private readonly discord: HalloweenDiscordClient,
    private readonly ui: HalloweenUi,
    private readonly gifties: GiftyService,
    private readonly lock: PlayerLock,
    private readonly db: DatabaseService,
  ) {}

  async handle(interaction: APIApplicationCommandGuildInteraction): Promise<void> {
    const guildId = interaction.guild_id;
    const fromUserId = interaction.member.user.id;
    const toUserId = this.recipient(interaction);

    await this.db.$transaction(async (tx) => {
      await this.lock.acquire(tx, "gifty", guildId, fromUserId);
      try {
        await this.gifties.save(
          { guildId, fromUserId, toUserId },
          { rateLimit: !isAdministrator(interaction) },
          tx,
        );
      } catch (error) {
        if (error instanceof ValidationError && isGiftyRateLimitError(error)) {
          await this.discord.editOriginalResponse(interaction.token, {
            embeds: [
              {
                author: this.ui.author(),
                timestamp: this.ui.timestamp(),
                color: Color.Error,
                title: `${EVENT_NAME} - Gifty Already Sent`,
                description:
                  "You have already sent a gifty since the last reset. Try again soon!",
                footer: this.ui.errorFooter(interaction),
              },
            ],
          });
          return;
        }
        throw error;
      }

      await this.discord.editOriginalResponse(interaction.token, {
        allowed_mentions: {
          users: fromUserId === toUserId ? [fromUserId] : [fromUserId, toUserId],
        },
        embeds: [
          {
            author: this.ui.author(),
            timestamp: this.ui.timestamp(),
            color: Color.Primary,
            title: `${EVENT_NAME} - New Gifty!`,
            description: `<@${fromUserId}> is spreading the love! They just sent a one-time-use extra knock to a lucky friend.`,
            fields: [{ name: "Recipient", value: `<@${toUserId}>` }],
          },
        ],
      });
    });
  }

  private recipient(interaction: APIApplicationCommandGuildInteraction): string {
    if (isUserCommand(interaction)) {
      return interaction.data.target_id;
    }
    if (isChatInput(interaction)) {
      const [toUser] = interaction.data.options ?? [];
      if (toUser?.type === ApplicationCommandOptionType.User) {
        return toUser.value;
      }
      throw new HalloweenDiscordError({
        thrownFrom: "GiftyCommand (chat)",
        message: "No user specified",
        logAsError: false,
        sourceError: new Error(
          toUser
            ? "Incoming interaction has options, but first option is not of type user. Need one for gifty command"
            : "Incoming interaction has no options. Need one for gifty command",
        ),
      });
    }
    throw new HalloweenDiscordError({
      thrownFrom: "GiftyCommand",
      message:
        "Unexpected command type. Gifty can be used as a slash command or by right clicking on a user.",
      logAsError: false,
      sourceError: new Error(
        "The incoming interaction is neither a UserGuildCommand or a GuildChatCommand",
      ),
    });
  }
}
