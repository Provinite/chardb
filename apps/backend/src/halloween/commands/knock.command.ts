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
import type {
  HalloweenCommandHandler,
  HalloweenCommandResult,
  HalloweenReply,
} from "../discord/halloween-command";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { Color, HalloweenUi } from "../discord/ui";
import { HalloweenRandom } from "../random";
import { GuildSettingsService } from "../services/guild-settings.service";
import { PrizeService } from "../services/prize.service";
import { KnockEventService } from "../services/knock-event.service";
import { GiftyService } from "../services/gifty.service";
import { DeviantArtUserService } from "../services/deviantart-user.service";
import { PrizeAwardService } from "../services/prize-award.service";
import { PrizeImageService } from "../services/prize-image.service";
import { PlayerLock } from "../services/player-lock";
import { lockedTransaction } from "../services/locked-transaction";
import { DatabaseService } from "../../database/database.service";
import {
  EventEndedError,
  EventNotStartedError,
  OutOfPrizesError,
  TooManyKnocksError,
} from "../errors";
import { EventStatus } from "../time";
import { formatChardbLink } from "../chardb-link";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import { requireChatInput } from "./command-helpers";

/**
 * What a committed knock answers with and leaves to do: announce a win,
 * deliver the prize, log the outcome.
 */
interface KnockResult {
  reply: HalloweenReply;
  /** The win as posted to the win channel, if the guild has one. */
  announcement: {
    channelId: string;
    message: RESTPostAPIChannelMessageJSONBody;
  } | null;
  prize: HalloweenPrize | null;
  log: HalloweenLogLine;
}

/**
 * `/knock`: trick or treat.
 *
 * The bot split this across two Lambdas joined by a queue -- one rolled the
 * dice and saved a pending win, the other picked the prize -- so it could
 * answer Discord within three seconds. Here the whole knock is one
 * transaction, of database work only, and its result is the reply: a knock
 * that fails part-way leaves no trace, and the player keeps it.
 *
 * The win is committed before Discord shows it. If the reply is lost, the
 * controller logs that; the win stands, and the prize is still delivered.
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
    private readonly prizeImages: PrizeImageService,
    private readonly lock: PlayerLock,
    private readonly random: HalloweenRandom,
    private readonly db: DatabaseService,
  ) {}

  async handle(
    interaction: APIApplicationCommandGuildInteraction,
  ): Promise<HalloweenCommandResult> {
    return this.knock(requireChatInput(interaction));
  }

  /** Also how `/adminknock` knocks on a player's behalf. */
  async knock(
    interaction: APIChatInputApplicationCommandGuildInteraction,
  ): Promise<HalloweenCommandResult> {
    const guildId = interaction.guild_id;
    const userId = interaction.member.user.id;
    const who = { interactionId: interaction.id, guildId, userId };

    const result = await lockedTransaction(
      this.db,
      "KnockCommand",
      async (tx) => {
        // Before reading the allowance, so two knocks at once cannot both pass.
        await this.lock.acquire(tx, "knock", guildId, userId);
        const settings = await this.guildSettings.get(guildId, tx);

        const status = this.guildSettings.eventStatus(settings);
        const dates = {
          startDate: settings.startDate,
          endDate: settings.endDate,
        };
        if (status === EventStatus.Ended) {
          throw new EventEndedError({ thrownFrom: "KnockCommand", ...dates });
        }
        if (status === EventStatus.NotStartedYet) {
          throw new EventNotStartedError({
            thrownFrom: "KnockCommand",
            ...dates,
          });
        }

        if (!(await this.prizes.hasInStock(guildId, tx))) {
          throw new OutOfPrizesError({ thrownFrom: "KnockCommand", guildId });
        }

        const knockCount = await this.knocks.countSinceLastReset(
          settings,
          userId,
          tx,
        );
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
        this.logger.log({
          event: HalloweenLogEvent.KnockRolled,
          message: `Knock by ${userId} rolled ${roll} against ${settings.winRate}: ${win ? "win" : "loss"}`,
          ...who,
          roll,
          winRate: settings.winRate,
          win,
          knocksUsed: knockCount,
          knocksPerDay: settings.knocksPerDay,
          giftyId: gifty?.id ?? null,
        } satisfies HalloweenLogLine);

        return win
          ? this.win(interaction, settings, gifty, tx)
          : this.lose(interaction, settings, knockCount, gifty, tx);
      },
    );

    // Logged only once committed, so the log never shows a win that was
    // rolled back.
    this.logger.log(result.log);

    const { announcement, prize } = result;
    const isChardbPrize = Boolean(prize?.itemTypeId || prize?.characterId);
    if (!announcement && !isChardbPrize) {
      return { reply: result.reply };
    }
    return {
      reply: result.reply,
      afterReply: async () => {
        if (announcement) {
          await this.announce(announcement, interaction, prize);
        }
        if (prize && isChardbPrize) {
          await this.deliver(prize, interaction);
        }
      },
    };
  }

  /** Posts the win to the guild's win channel. A failure leaves the win. */
  private async announce(
    { channelId, message }: NonNullable<KnockResult["announcement"]>,
    interaction: APIChatInputApplicationCommandGuildInteraction,
    prize: HalloweenPrize | null,
  ): Promise<void> {
    try {
      await this.discord.createChannelMessage(channelId, message);
    } catch (error) {
      this.logger.error(
        {
          event: HalloweenLogEvent.WinChannelPostFailed,
          message: `Could not announce a win in channel ${channelId}`,
          interactionId: interaction.id,
          guildId: interaction.guild_id,
          userId: interaction.member.user.id,
          winChannel: channelId,
          prizeId: prize?.id ?? null,
          cause: error instanceof Error ? error.message : String(error),
        } satisfies HalloweenLogLine,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Hands over a chardb prize. A failure leaves the win, logged to act on. */
  private async deliver(
    prize: HalloweenPrize,
    interaction: APIChatInputApplicationCommandGuildInteraction,
  ): Promise<void> {
    const userId = interaction.member.user.id;
    const delivery = {
      interactionId: interaction.id,
      guildId: interaction.guild_id,
      userId,
      prizeId: prize.id,
      itemTypeId: prize.itemTypeId,
      characterId: prize.characterId,
    };
    // After commit; see PrizeAwardService for why it cannot be inside.
    try {
      await this.prizeAward.award(prize, userId);
      this.logger.log({
        event: HalloweenLogEvent.PrizeDelivered,
        message: `Delivered prize ${prize.id} to Discord user ${userId}`,
        ...delivery,
      } satisfies HalloweenLogLine);
    } catch (error) {
      this.logger.error(
        {
          event: HalloweenLogEvent.PrizeDeliveryFailed,
          message: `Prize ${prize.id} won by ${userId} was not delivered; grant it by hand`,
          ...delivery,
          cause: error instanceof Error ? error.message : String(error),
        } satisfies HalloweenLogLine,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async lose(
    interaction: APIChatInputApplicationCommandGuildInteraction,
    settings: HalloweenGuildSettings,
    knockCount: number,
    gifty: HalloweenGifty | null,
    tx: Prisma.TransactionClient,
  ): Promise<KnockResult> {
    const guildId = interaction.guild_id;
    const userId = interaction.member.user.id;
    const knockEvent = await this.knocks.save(
      { guildId, userId, prizeId: null },
      tx,
    );
    if (gifty) {
      gifty = await this.gifties.fulfill(gifty, knockEvent, tx);
    }

    // Negative while spending gifties.
    const remainingKnocks = Math.max(
      0,
      settings.knocksPerDay - (knockCount + 1),
    );
    const bankedGifties = await this.gifties.pendingCount(guildId, userId, tx);

    const fields: APIEmbedField[] = [];
    if (gifty) {
      fields.push({ name: "Knock Gifted By", value: `<@${gifty.fromUserId}>` });
    }
    fields.push(
      { name: "Remaining Knocks", value: `${remainingKnocks}`, inline: true },
      { name: "Banked Gifties", value: `${bankedGifties}`, inline: true },
      { name: "Trick or Treater", value: `<@${userId}>` },
    );

    return {
      reply: {
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
      },
      announcement: null,
      prize: null,
      log: {
        event: HalloweenLogEvent.KnockLost,
        message: `Knock by ${userId} lost`,
        interactionId: interaction.id,
        guildId,
        userId,
        knockEventId: knockEvent.id,
        giftyId: gifty?.id ?? null,
        giftyFrom: gifty?.fromUserId ?? null,
        remainingKnocks,
        bankedGifties,
      },
    };
  }

  private async win(
    interaction: APIChatInputApplicationCommandGuildInteraction,
    settings: HalloweenGuildSettings,
    gifty: HalloweenGifty | null,
    tx: Prisma.TransactionClient,
  ): Promise<KnockResult> {
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
    const { currentStock: stockRemaining } = await this.prizes.decrementStock(
      prize.id,
      guildId,
      tx,
    );
    await this.prizeAward.validate(prize, guildId, tx);

    const knockCount = await this.knocks.countSinceLastReset(
      settings,
      userId,
      tx,
    );
    const deviantArtUser = await this.deviantArtUsers.get(
      { guildId, userId },
      tx,
    );
    const imageUrl = await this.prizeImages.imageFor(prize);

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
    const remainingKnocks = Math.max(0, settings.knocksPerDay - knockCount);
    const bankedGifties = await this.gifties.pendingCount(guildId, userId, tx);
    fields.push(
      { name: "Remaining Knocks", value: `${remainingKnocks}`, inline: true },
      { name: "Banked Gifties", value: `${bankedGifties}`, inline: true },
      { name: "Winner", value: `<@${userId}>` },
    );

    const message: RESTPostAPIChannelMessageJSONBody = {
      allowed_mentions: { users: [userId] },
      embeds: [
        {
          author: this.ui.author(),
          title: "Winner!",
          description: "You won! Congratulations on your lovely new prize!",
          ...(imageUrl ? { image: { url: imageUrl } } : {}),
          color: Color.Primary,
          fields,
          timestamp: this.ui.timestamp(),
        },
      ],
    };

    return {
      reply: {
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
      },
      announcement: settings.winChannel
        ? { channelId: settings.winChannel, message }
        : null,
      prize,
      log: {
        event: HalloweenLogEvent.KnockWon,
        message: `Knock by ${userId} won ${prize.id} (${stockRemaining} left)`,
        interactionId: interaction.id,
        guildId,
        userId,
        knockEventId: knockEvent.id,
        prizeId: prize.id,
        prizeName: prize.name,
        stockRemaining,
        itemTypeId: prize.itemTypeId,
        characterId: prize.characterId,
        giftyId: gifty?.id ?? null,
        giftyFrom: gifty?.fromUserId ?? null,
        remainingKnocks,
        bankedGifties,
        hasDeviantArt: deviantArtUser !== null,
        announcedIn: settings.winChannel,
      },
    };
  }
}
