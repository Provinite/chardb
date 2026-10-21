import { Injectable } from "@nestjs/common";
import type {
  HalloweenGifty,
  HalloweenKnockEvent,
  Prisma,
} from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { GuildSettingsService } from "./guild-settings.service";
import { ValidationError, type ValidationFieldError } from "../errors";

export interface GiftyInput {
  guildId: string;
  fromUserId: string;
  toUserId: string;
}

@Injectable()
export class GiftyService {
  constructor(
    private readonly db: DatabaseService,
    private readonly settings: GuildSettingsService,
  ) {}

  /** Spends a pending gifty on a knock. */
  async fulfill(
    gifty: HalloweenGifty,
    knockEvent: HalloweenKnockEvent,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<HalloweenGifty> {
    if (gifty.knockEventId !== null) {
      throw new ValidationError({
        message: "This gifty was already used on a knock",
        thrownFrom: "GiftyService.fulfill",
        details: { giftyId: gifty.id },
        validationErrors: [
          {
            field: "gifty",
            error:
              "Tried to redeem a gifty that was already redeemed. Something went wrong.",
          },
        ],
      });
    }
    return tx.halloweenGifty.update({
      where: { id: gifty.id },
      data: { knockEventId: knockEvent.id },
    });
  }

  /**
   * @param options.rateLimit false skips the one-per-reset limit; admins get
   *   unlimited gifties for fixing things.
   */
  async save(
    gifty: GiftyInput,
    options: { rateLimit: boolean },
    tx: Prisma.TransactionClient = this.db,
  ): Promise<HalloweenGifty> {
    const validation = await this.validateForCreate(gifty, options, tx);
    if (validation !== true) {
      throw new ValidationError({
        message: "Gifty validation failed",
        validationErrors: validation,
        thrownFrom: "GiftyService.save",
      });
    }
    return tx.halloweenGifty.create({ data: gifty });
  }

  async validateForCreate(
    gifty: GiftyInput,
    options: { rateLimit: boolean },
    tx: Prisma.TransactionClient = this.db,
  ): Promise<true | ValidationFieldError[]> {
    const numeric = (s: string) => /^\d+$/.test(s);
    const rules: [string, string, () => boolean | Promise<boolean>][] = [
      [
        "guildId",
        "Guild ID must be a numeric string",
        () => numeric(gifty.guildId),
      ],
      [
        "fromUserId",
        "from user id must be a numeric string",
        () => numeric(gifty.fromUserId),
      ],
      [
        "toUserId",
        "to user id must be a numeric string",
        () => numeric(gifty.toUserId),
      ],
      [
        // "*": the rule is about the sender, not a field. The gifty command
        // tells this failure apart from the others by it.
        "*",
        "Each user may only send one gifty per reset",
        async () => {
          if (!options.rateLimit) {
            return true;
          }
          const [settings, lastGifty] = await Promise.all([
            this.settings.get(gifty.guildId, tx),
            this.lastSent(gifty.guildId, gifty.fromUserId, tx),
          ]);
          return (
            !lastGifty || this.settings.lastReset(settings) > lastGifty.time
          );
        },
      ],
    ];
    const failing: ValidationFieldError[] = [];
    for (const [field, error, ok] of rules) {
      if (!(await ok())) {
        failing.push({ field, error });
      }
    }
    return failing.length ? failing : true;
  }

  async lastSent(
    guildId: string,
    fromUserId: string,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<HalloweenGifty | null> {
    return tx.halloweenGifty.findFirst({
      where: { guildId, fromUserId },
      orderBy: { time: "desc" },
    });
  }

  /** The oldest gifty the player has not spent yet. */
  async nextPending(
    guildId: string,
    toUserId: string,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<HalloweenGifty | null> {
    return tx.halloweenGifty.findFirst({
      where: { guildId, toUserId, knockEventId: null },
      orderBy: { time: "asc" },
    });
  }

  async pendingCount(
    guildId: string,
    toUserId: string,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<number> {
    return tx.halloweenGifty.count({
      where: { guildId, toUserId, knockEventId: null },
    });
  }
}
