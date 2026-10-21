import { Injectable, Logger } from "@nestjs/common";
import {
  ApplicationCommandOptionType,
  type APIApplicationCommandGuildInteraction,
} from "@discordjs/core";
import type { HalloweenGifty } from "@chardb/database";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import type {
  HalloweenCommandHandler,
  HalloweenCommandResult,
} from "../discord/halloween-command";
import { Color, EVENT_NAME, HalloweenUi } from "../discord/ui";
import { GiftyService } from "../services/gifty.service";
import { PlayerLock } from "../services/player-lock";
import { lockedTransaction } from "../services/locked-transaction";
import { DatabaseService } from "../../database/database.service";
import { GuildSettingsService } from "../services/guild-settings.service";
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
  private readonly logger = new Logger(GiftyCommand.name);

  constructor(
    private readonly ui: HalloweenUi,
    private readonly gifties: GiftyService,
    private readonly lock: PlayerLock,
    private readonly db: DatabaseService,
    private readonly guildSettings: GuildSettingsService,
  ) {}

  async handle(
    interaction: APIApplicationCommandGuildInteraction,
  ): Promise<HalloweenCommandResult> {
    const guildId = interaction.guild_id;
    const fromUserId = interaction.member.user.id;
    const toUserId = this.recipient(interaction);
    const rateLimitSkipped = isAdministrator(interaction);
    const who = {
      interactionId: interaction.id,
      guildId,
      fromUserId,
      toUserId,
    };

    // A gifty belongs to the guild's event, and is limited per reset, which
    // is one of its settings: until the event is set up there is nothing to
    // gift towards. Throws the "not ready yet" answer, for admins too.
    await this.guildSettings.getCached(guildId);

    const sent = await lockedTransaction(
      this.db,
      "GiftyCommand",
      async (tx): Promise<HalloweenGifty | null> => {
        await this.lock.acquire(tx, "gifty", guildId, fromUserId);
        try {
          return await this.gifties.save(
            { guildId, fromUserId, toUserId },
            { rateLimit: !rateLimitSkipped },
            tx,
          );
        } catch (error) {
          if (
            error instanceof ValidationError &&
            isGiftyRateLimitError(error)
          ) {
            return null;
          }
          throw error;
        }
      },
    );

    if (!sent) {
      this.logger.log({
        event: HalloweenLogEvent.GiftyRateLimited,
        message: "Refused a second gifty this reset",
        ...who,
      } satisfies HalloweenLogLine);
      return {
        reply: {
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
        },
      };
    }

    this.logger.log({
      event: HalloweenLogEvent.GiftySent,
      message: "Gifty sent",
      ...who,
      giftyId: sent.id,
      rateLimitSkipped,
    } satisfies HalloweenLogLine);
    return {
      reply: {
        allowed_mentions: {
          users:
            fromUserId === toUserId ? [fromUserId] : [fromUserId, toUserId],
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
      },
    };
  }

  private recipient(
    interaction: APIApplicationCommandGuildInteraction,
  ): string {
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
