import { Injectable } from "@nestjs/common";
import type { Prisma } from "@chardb/database";

/**
 * A per-player Postgres advisory lock, held until the transaction ends.
 *
 * The bot checked a player's allowance and then spent it as two separate
 * steps, so two knocks (or gifties) landing together could both pass the
 * check. Taking this lock first makes the second wait for the first to commit
 * and then see it.
 */
@Injectable()
export class PlayerLock {
  async acquire(
    tx: Prisma.TransactionClient,
    scope: "knock" | "gifty",
    guildId: string,
    userId: string,
  ): Promise<void> {
    const key = `halloween:${scope}:${guildId}:${userId}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }
}
