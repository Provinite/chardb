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
  HalloweenKnockEvent,
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
import {
  KnockEventService,
  type KnockEventInput,
} from "../services/knock-event.service";
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
import { HalloweenLinks } from "../halloween-links";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import { requireChatInput } from "./command-helpers";

/** A knock as committed. Its reply is built after, outside the transaction. */
interface Spent {
  knockEvent: HalloweenKnockEvent;
  /** The gifty that paid for it, if the day's knocks were gone. */
  gifty: HalloweenGifty | null;
  /** Knocks used from today's allowance before this one. */
  knockCount: number;
}

interface Win extends Spent {
  /** As taken: its `currentStock` is what is left. */
  prize: HalloweenPrize;
  /** `Date.now()` when the win asked for the pool, and when it got it. */
  poolRequestedAt: number;
  poolLockedAt: number;
}

type Knocked = { won: false; lost: Spent } | { won: true; win: Win };

/**
 * What a committed knock answers with and leaves to do: announce a win, log
 * the outcome.
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
 * answer Discord within three seconds. Here the dice are rolled first, and
 * what the knock saves is one transaction, of database work only: a knock
 * that fails part-way leaves no trace, and the player keeps it.
 *
 * A loss locks only the player. A win also locks the guild's whole prize
 * pool, so each winner picks from exactly the stock the winners before them
 * left: at the end of the event, when one-of-a-kind prizes are down to their
 * last, the odds stay exact. Winners therefore take turns, and everything
 * that does not depend on the prize is done before a winner joins the queue.
 *
 * A win commits with its prize granted, before Discord shows it. If the reply
 * is lost, the controller logs that; the win and the prize stand.
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
    private readonly links: HalloweenLinks,
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

    const settings = await this.guildSettings.getCached(guildId);
    const status = this.guildSettings.eventStatus(settings);
    const dates = { startDate: settings.startDate, endDate: settings.endDate };
    if (status === EventStatus.Ended) {
      throw new EventEndedError({ thrownFrom: "KnockCommand", ...dates });
    }
    if (status === EventStatus.NotStartedYet) {
      throw new EventNotStartedError({ thrownFrom: "KnockCommand", ...dates });
    }
    // Unlocked, so it can be stale: a win checks again under the pool's lock.
    if (!(await this.prizes.hasInStock(guildId))) {
      throw new OutOfPrizesError({ thrownFrom: "KnockCommand", guildId });
    }

    const roll = this.random.unit();
    // The roll is in [0, 1): this wins exactly winRate of the time. The bot's
    // `<=` could win at a rate of 0.
    const win = roll < settings.winRate;
    this.logger.log({
      event: HalloweenLogEvent.KnockRolled,
      message: "Knock rolled",
      ...who,
      roll,
      winRate: settings.winRate,
      win,
    } satisfies HalloweenLogLine);

    const started = Date.now();
    const knocked = await lockedTransaction<Knocked>(
      this.db,
      "KnockCommand",
      async (tx) => {
        const allowance = await this.allowance(interaction, settings, tx);
        return win
          ? { won: true, win: await this.win(interaction, allowance, tx) }
          : {
              won: false,
              lost: await this.record(
                interaction,
                allowance,
                { prizeId: null, candySlug: this.ui.candySlug() },
                tx,
              ),
            };
      },
    );
    const committedAt = Date.now();
    const transactionMs = committedAt - started;

    const result = knocked.won
      ? await this.announceable(interaction, settings, knocked.win)
      : await this.lost(interaction, settings, knocked.lost);
    const timings = knocked.won
      ? {
          transactionMs,
          prizeLockWaitMs:
            knocked.win.poolLockedAt - knocked.win.poolRequestedAt,
          prizeLockHeldMs: committedAt - knocked.win.poolLockedAt,
        }
      : { transactionMs };

    // Logged only once committed, so the log never shows a win that was
    // rolled back.
    this.logger.log({ ...result.log, ...timings });

    const { announcement, prize } = result;
    if (!announcement) {
      return { reply: result.reply };
    }
    return {
      reply: result.reply,
      afterReply: () => this.announce(announcement, interaction, prize),
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
          message: "Could not announce a win in the win channel",
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

  /**
   * Which of the player's knocks this is: one of the day's, or one a gifty
   * pays for once those are gone. Takes the player's lock before reading the
   * allowance, so two knocks at once cannot both pass.
   */
  private async allowance(
    interaction: APIChatInputApplicationCommandGuildInteraction,
    settings: HalloweenGuildSettings,
    tx: Prisma.TransactionClient,
  ): Promise<Omit<Spent, "knockEvent">> {
    const guildId = interaction.guild_id;
    const userId = interaction.member.user.id;
    await this.lock.acquire(tx, "knock", guildId, userId);
    const knockCount = await this.knocks.countSinceLastReset(
      settings,
      userId,
      tx,
    );
    let gifty: HalloweenGifty | null = null;
    if (knockCount >= settings.knocksPerDay) {
      // No row lock needed: only this player's knocks spend their gifties,
      // and the player's lock lets one through at a time.
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
    return { gifty, knockCount };
  }

  /** Saves the knock, and spends the gifty that paid for it. */
  private async record(
    interaction: APIChatInputApplicationCommandGuildInteraction,
    { gifty, knockCount }: Omit<Spent, "knockEvent">,
    outcome: Pick<KnockEventInput, "prizeId" | "candySlug">,
    tx: Prisma.TransactionClient,
  ): Promise<Spent> {
    const knockEvent = await this.knocks.save(
      {
        guildId: interaction.guild_id,
        userId: interaction.member.user.id,
        ...outcome,
      },
      tx,
    );
    if (gifty) {
      gifty = await this.gifties.fulfill(gifty, knockEvent, tx);
    }
    return { knockEvent, gifty, knockCount };
  }

  /** A committed loss's reply and log line. */
  private async lost(
    interaction: APIChatInputApplicationCommandGuildInteraction,
    settings: HalloweenGuildSettings,
    { knockEvent, gifty, knockCount }: Spent,
  ): Promise<KnockResult> {
    const guildId = interaction.guild_id;
    const userId = interaction.member.user.id;

    // Negative while spending gifties.
    const remainingKnocks = Math.max(
      0,
      settings.knocksPerDay - (knockCount + 1),
    );
    const bankedGifties = await this.gifties.pendingCount(guildId, userId);

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
            ...(knockEvent.candySlug && {
              image: { url: this.ui.candyImageUrl(knockEvent.candySlug) },
            }),
            footer: { text: "Come back soon!" },
          },
        ],
      },
      announcement: null,
      prize: null,
      log: {
        event: HalloweenLogEvent.KnockLost,
        message: "Knock lost",
        interactionId: interaction.id,
        guildId,
        userId,
        knockEventId: knockEvent.id,
        candySlug: knockEvent.candySlug,
        knocksUsed: knockCount,
        knocksPerDay: settings.knocksPerDay,
        giftyId: gifty?.id ?? null,
        giftyFrom: gifty?.fromUserId ?? null,
        remainingKnocks,
        bankedGifties,
      },
    };
  }

  /**
   * Takes the guild's pool, picks a prize by stock times weight, and hands it
   * over. Every other winner in the guild waits from `lockInStock` until this
   * commits, so only what depends on the prize happens here.
   */
  private async win(
    interaction: APIChatInputApplicationCommandGuildInteraction,
    allowance: Omit<Spent, "knockEvent">,
    tx: Prisma.TransactionClient,
  ): Promise<Win> {
    const guildId = interaction.guild_id;

    const poolRequestedAt = Date.now();
    const pool = await this.prizes.lockInStock(guildId, tx);
    const poolLockedAt = Date.now();
    if (!pool.length) {
      throw new OutOfPrizesError({ thrownFrom: "KnockCommand.win", guildId });
    }
    const pick = this.random.weighted(
      pool,
      pool.map((p) => p.currentStock * p.weight),
    );
    // Before taking it, so a misconfigured prize is never used up.
    await this.prizeAward.validate(pick, guildId, tx);
    const prize = await this.prizes.decrement(pick.id, guildId, tx);
    await this.prizeAward.grant(prize, interaction.member.user, tx);
    const spent = await this.record(
      interaction,
      allowance,
      { prizeId: prize.id, candySlug: null },
      tx,
    );
    return { ...spent, prize, poolRequestedAt, poolLockedAt };
  }

  /** A committed win's reply, its win-channel post, and its log line. */
  private async announceable(
    interaction: APIChatInputApplicationCommandGuildInteraction,
    { winChannel, knocksPerDay }: HalloweenGuildSettings,
    { prize, knockEvent, gifty, knockCount }: Win,
  ): Promise<KnockResult> {
    const guildId = interaction.guild_id;
    const userId = interaction.member.user.id;
    const [imageUrl, deviantArtUser, bankedGifties, chardbLink] =
      await Promise.all([
        this.imageFor(prize, interaction),
        this.deviantArtUsers.get({ guildId, userId }),
        this.gifties.pendingCount(guildId, userId),
        this.links.chardbLink(guildId, prize),
      ]);
    const hasDeviantArt = deviantArtUser !== null;
    // The count from before this knock; zero while spending gifties.
    const remainingKnocks = Math.max(0, knocksPerDay - (knockCount + 1));

    const fields: APIEmbedField[] = [{ name: "Prize", value: prize.name }];
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
          ...(hasDeviantArt
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
      announcement: winChannel ? { channelId: winChannel, message } : null,
      prize,
      log: {
        event: HalloweenLogEvent.KnockWon,
        message: "Knock won",
        interactionId: interaction.id,
        guildId,
        userId,
        knockEventId: knockEvent.id,
        prizeId: prize.id,
        prizeName: prize.name,
        stockRemaining: prize.currentStock,
        itemTypeId: prize.itemTypeId,
        characterId: prize.characterId,
        giftyId: gifty?.id ?? null,
        giftyFrom: gifty?.fromUserId ?? null,
        remainingKnocks,
        bankedGifties,
        hasDeviantArt,
        announcedIn: winChannel,
        knocksUsed: knockCount,
        knocksPerDay,
      },
    };
  }

  /**
   * The prize's picture, after commit so the lookup holds no lock. A failure
   * shows the win without it.
   */
  private async imageFor(
    prize: HalloweenPrize,
    interaction: APIChatInputApplicationCommandGuildInteraction,
  ): Promise<string | null> {
    try {
      return await this.prizeImages.imageFor(prize);
    } catch (error) {
      this.logger.error(
        {
          event: HalloweenLogEvent.PrizeImageLookupFailed,
          message: "Could not look up a won prize's image",
          interactionId: interaction.id,
          guildId: interaction.guild_id,
          userId: interaction.member.user.id,
          prizeId: prize.id,
          cause: error instanceof Error ? error.message : String(error),
        } satisfies HalloweenLogLine,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }
}
