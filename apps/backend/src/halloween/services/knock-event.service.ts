import { Injectable } from "@nestjs/common";
import type {
  HalloweenGuildSettings,
  HalloweenKnockEvent,
  Prisma,
} from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { GuildSettingsService } from "./guild-settings.service";
import { ValidationError, type ValidationFieldError } from "../errors";
import { candyOwnerFor } from "../candies/candy-claims";

/**
 * A knock as it happened: lost with its candy, or won with its prize. The bot
 * saved a win as pending until a second Lambda picked the prize; nothing here
 * does.
 */
export interface KnockEventInput {
  guildId: string;
  userId: string;
  prizeId: string | null;
  candySlug: string | null;
}

export function validateKnockEventForCreate({
  guildId,
  userId,
}: KnockEventInput): true | ValidationFieldError[] {
  const rules: [string, string, () => boolean][] = [
    ["userId", "UserID is required", () => Boolean(userId)],
    ["guildId", "GuildID is required", () => Boolean(guildId)],
    ["userId", "UserID should be a numeric string", () => /^\d+$/.test(userId)],
  ];
  const failing = rules.filter(([, , ok]) => !ok());
  return failing.length
    ? failing.map(([field, error]) => ({ field, error }))
    : true;
}

@Injectable()
export class KnockEventService {
  constructor(
    private readonly db: DatabaseService,
    private readonly settings: GuildSettingsService,
  ) {}

  async save(
    knock: KnockEventInput,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<HalloweenKnockEvent> {
    const validation = validateKnockEventForCreate(knock);
    if (validation !== true) {
      throw new ValidationError({
        message: "Invalid knock event",
        validationErrors: validation,
        thrownFrom: "KnockEventService.save",
      });
    }
    const event = await tx.halloweenKnockEvent.create({ data: knock });
    if (knock.candySlug) {
      await tx.halloweenCandy.create({
        data: {
          guildId: knock.guildId,
          slug: knock.candySlug,
          knockEventId: event.id,
          discordUserId: knock.userId,
          receivedAt: event.time,
          ownerId: await candyOwnerFor(tx, knock.guildId, knock.userId),
        },
      });
    }
    return event;
  }

  /**
   * Knocks the player has used from today's allowance. A knock paid for with
   * a gifty is not one of them.
   */
  async countSinceLastReset(
    settings: HalloweenGuildSettings,
    userId: string,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<number> {
    return tx.halloweenKnockEvent.count({
      where: {
        guildId: settings.guildId,
        userId,
        time: { gt: this.settings.lastReset(settings) },
        gifties: { none: {} },
      },
    });
  }
}
