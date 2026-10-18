import { Injectable } from "@nestjs/common";
import type {
  HalloweenGuildSettings,
  HalloweenKnockEvent,
  Prisma,
} from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { GuildSettingsService } from "./guild-settings.service";
import {
  DiscordReportableError,
  ValidationError,
  type ValidationFieldError,
} from "../errors";

export interface KnockEventInput {
  guildId: string;
  userId: string;
  prizeId: string | null;
  isPending?: boolean;
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
    return tx.halloweenKnockEvent.create({ data: knock });
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

  /** Records the prize a pending win turned into. */
  async fulfillPending(
    knockEventId: number,
    prizeId: string,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<HalloweenKnockEvent> {
    const pending = await tx.halloweenKnockEvent.findFirst({
      where: { id: knockEventId, isPending: true },
    });
    if (!pending) {
      throw new DiscordReportableError(
        "Knock event not found during fulfillment",
        {
          thrownFrom: "KnockEventService.fulfillPending",
          logAsError: true,
          sourceError: new Error(
            `No knock event found with { id: ${knockEventId}, isPending: true }`,
          ),
        },
      );
    }
    return tx.halloweenKnockEvent.update({
      where: { id: knockEventId },
      data: { isPending: false, prizeId },
    });
  }
}
