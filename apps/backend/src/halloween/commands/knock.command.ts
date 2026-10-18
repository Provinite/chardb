import { Injectable, Logger } from "@nestjs/common";
import type {
  APIApplicationCommandGuildInteraction,
  APIChatInputApplicationCommandGuildInteraction,
  APIEmbedField,
  RESTPostAPIChannelMessageJSONBody,
} from "@discordjs/core";
import type {
  HalloweenGifty,
  HalloweenGuildSettings,
  HalloweenPrize,
  Prisma,
} from "@chardb/database";
import type { HalloweenCommandHandler } from "../discord/halloween-command";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { Color, HalloweenUi } from "../discord/ui";
import { HalloweenRandom } from "../random";
import { GuildSettingsService } from "../services/guild-settings.service";
import { PrizeService } from "../services/prize.service";
import { KnockEventService } from "../services/knock-event.service";
import { GiftyService } from "../services/gifty.service";
import { DeviantArtUserService } from "../services/deviantart-user.service";
import { PrizeAwardService } from "../services/prize-award.service";
import { PlayerLock } from "../services/player-lock";
import { DatabaseService } from "../../database/database.service";
import {
  EventEndedError,
  EventNotStartedError,
  OutOfPrizesError,
  TooManyKnocksError,
} from "../errors";
import { EventStatus } from "../time";
import { formatChardbLink } from "../chardb-link";
import { requireChatInput } from "./command-helpers";

/**
 * The knock holds row locks while it talks to Discord, which can be slow;
 * Prisma's 5s default is too tight for that.
 */
const KNOCK_TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 20_000 };

/**
 * `/knock`: trick or treat.
 *
 * The bot split this across two Lambdas joined by a queue -- one rolled the
 * dice and saved a pending win, the other picked the prize -- so it could
 * answer Discord within three seconds. That is the controller's deferred reply
 * now, and the whole knock is one transaction: a knock that fails part-way
 * leaves no trace, and the player keeps it.
 */
@Injectable()
export class KnockCommand implements HalloweenCommandHandler {
  readonly name = "knock";
  private readonly logger = new Logger(KnockCommand.name);

  constructor(
    private readonly discord: HalloweenDiscordClient,
    private readonly ui: HalloweenUi,
    private readonly guildSettings: GuildSettingsService,
    private readonly prizes: PrizeService,
    private readonly knocks: KnockEventService,
    private readonly gifties: GiftyService,
    private readonly deviantArtUsers: DeviantArtUserService,
    private readonly prizeAward: PrizeAwardService,
    private readonly lock: PlayerLock,
    private readonly random: HalloweenRandom,
    private readonly db: DatabaseService,
  ) {}

  async handle(interaction: APIApplicationCommandGuildInteraction): Promise<void> {
    await this.knock(requireChatInput(interaction));
  }

  /** Also how `/adminknock` knocks on a player's behalf. */
  async knock(interaction: APIChatInputApplicationCommandGuildInteraction): Promise<void> {
    const guildId = interaction.guild_id;
    const userId = interaction.member.user.id;

    const won = await this.db.$transaction(async (tx) => {
      // Before reading the allowance, so two knocks at once cannot both pass.
      await this.lock.acquire(tx, "knock", guildId, userId);
      const settings = await this.guildSettings.get(guildId, tx);

      const status = this.guildSettings.eventStatus(settings);
      const dates = { startDate: settings.startDate, endDate: settings.endDate };
      if (status === EventStatus.Ended) {
        throw new EventEndedError({ thrownFrom: "KnockCommand", ...dates });
      }
      if (status === EventStatus.NotStartedYet) {
        throw new EventNotStartedError({ thrownFrom: "KnockCommand", ...dates });
      }

      if (!(await this.prizes.hasInStock(guildId, tx))) {
        throw new OutOfPrizesError({ thrownFrom: "KnockCommand", guildId });
      }

      const knockCount = await this.knocks.countSinceLastReset(settings, userId, tx);
      let gifty: HalloweenGifty | null = null;
      if (knockCount >= settings.knocksPerDay) {
        gifty = await this.gifties.nextPending(guildId, userId, tx);
        if (!gifty) {
          throw new TooManyKnocksError({
            thrownFrom: "KnockCommand",
            guildId,
            userId,
            knocksPerDay: settings.knocksPerDay,
            resetTime: settings.resetTime,
            lastResetTime: this.guildSettings.lastReset(settings),
          });
        }
      }

      const roll = this.random.unit();
      const win = roll <= settings.winRate;
      this.logger.log(
        `Knock by ${userId} in ${guildId}: rolled ${roll} against ${settings.winRate}, ${win ? "win" : "loss"}${gifty ? ` (gifty ${gifty.id})` : ""}`,
      );

      return win
        ? this.win(interaction, settings, gifty, tx)
        : this.lose(interaction, settings, knockCount, gifty, tx);
    }, KNOCK_TRANSACTION_OPTIONS);

    if (won) {
      // After commit; see PrizeAwardService for why it cannot be inside.
      await this.prizeAward.award(won, userId).catch((error: unknown) =>
        this.logger.error(
          `Prize ${won.id} won by ${userId} in ${guildId} was not delivered; grant it by hand`,
          error instanceof Error ? error.stack : String(error),
        ),
      );
    }
  }

  private async lose(
    interaction: APIChatInputApplicationCommandGuildInteraction,
    settings: HalloweenGuildSettings,
    knockCount: number,
    gifty: HalloweenGifty | null,
    tx: Prisma.TransactionClient,
  ): Promise<null> {
    const guildId = interaction.guild_id;
    const userId = interaction.member.user.id;
    const knockEvent = await this.knocks.save({ guildId, userId, prizeId: null }, tx);
    if (gifty) {
      gifty = await this.gifties.fulfill(gifty, knockEvent, tx);
    }

    const fields: APIEmbedField[] = [];
    if (gifty) {
      fields.push({ name: "Knock Gifted By", value: `<@${gifty.fromUserId}>` });
    }
    fields.push(
      {
        name: "Remaining Knocks",
        // Negative while spending gifties.
        value: `${Math.max(0, settings.knocksPerDay - (knockCount + 1))}`,
        inline: true,
      },
      {
        name: "Banked Gifties",
        value: `${await this.gifties.pendingCount(guildId, userId, tx)}`,
        inline: true,
      },
      { name: "Trick or Treater", value: `<@${userId}>` },
    );

    await this.discord.editOriginalResponse(interaction.token, {
      allowed_mentions: {
        users: gifty
          ? gifty.fromUserId === gifty.toUserId
            ? [gifty.fromUserId]
            : [gifty.fromUserId, gifty.toUserId]
          : [userId],
      },
      embeds: [
        {
          title: "No one was home",
          description:
            "You knocked and knocked but no one was home. Tricks this time.",
          fields,
          author: this.ui.author(),
          timestamp: this.ui.timestamp(),
          color: Color.Primary,
          image: { url: this.ui.candyImageUrl() },
          footer: { text: "Come back soon!" },
        },
      ],
    });
    return null;
  }

  private async win(
    interaction: APIChatInputApplicationCommandGuildInteraction,
    settings: HalloweenGuildSettings,
    gifty: HalloweenGifty | null,
    tx: Prisma.TransactionClient,
  ): Promise<HalloweenPrize> {
    const guildId = interaction.guild_id;
    const userId = interaction.member.user.id;
    const knockEvent = await this.knocks.save(
      { guildId, userId, prizeId: null, isPending: true },
      tx,
    );
    if (gifty) {
      gifty = await this.gifties.fulfill(gifty, knockEvent, tx);
    }

    // Locked: two winners must not both take the last of a prize.
    const pool = await this.prizes.inStock(guildId, tx, { lock: true });
    if (!pool.length) {
      throw new OutOfPrizesError({ thrownFrom: "KnockCommand.win", guildId });
    }
    const prize = this.random.weighted(
      pool,
      pool.map((p) => p.currentStock * p.weight),
    );
    await this.knocks.fulfillPending(knockEvent.id, prize.id, tx);
    await this.prizes.decrementStock(prize.id, guildId, tx);
    await this.prizeAward.validate(prize, guildId, tx);

    const knockCount = await this.knocks.countSinceLastReset(settings, userId, tx);
    const deviantArtUser = await this.deviantArtUsers.get({ guildId, userId }, tx);

    const fields: APIEmbedField[] = [{ name: "Prize", value: prize.name }];
    const chardbLink = formatChardbLink(prize);
    if (chardbLink) {
      fields.push({ name: "CharDB", value: chardbLink });
    }
    if (gifty) {
      fields.push({
        name: "Knock Gifted By",
        value: `<@${gifty.fromUserId}> (Go thank them!)`,
      });
    }
    fields.push(
      {
        name: "Remaining Knocks",
        value: `${Math.max(0, settings.knocksPerDay - knockCount)}`,
        inline: true,
      },
      {
        name: "Banked Gifties",
        value: `${await this.gifties.pendingCount(guildId, userId, tx)}`,
        inline: true,
      },
      { name: "Winner", value: `<@${userId}>` },
    );

    const message: RESTPostAPIChannelMessageJSONBody = {
      allowed_mentions: { users: [userId] },
      embeds: [
        {
          author: this.ui.author(),
          title: "Winner!",
          description: "You won! Congratulations on your lovely new prize!",
          image: { url: prize.image },
          color: Color.Primary,
          fields,
          timestamp: this.ui.timestamp(),
        },
      ],
    };

    await this.discord.editOriginalResponse(interaction.token, {
      ...message,
      embeds: [
        ...(message.embeds ?? []),
        ...(deviantArtUser
          ? []
          : [
              {
                author: this.ui.author(),
                title: "Reminder",
                description:
                  "If you haven't yet, please set your DeviantArt username with the `/deviantart` command",
                color: Color.Warning,
                timestamp: this.ui.timestamp(),
              },
            ]),
      ],
    });
    if (settings.winChannel) {
      await this.discord.createChannelMessage(settings.winChannel, message);
    }
    return prize;
  }
}
