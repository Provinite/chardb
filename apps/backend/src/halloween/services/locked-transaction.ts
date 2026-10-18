import { Prisma } from "@chardb/database";
import type { DatabaseService } from "../../database/database.service";
import { BusyError } from "../errors";

/**
 * How long a statement may wait for a lock: the player's advisory lock, or
 * the prize rows a win takes. Set by `PlayerLock`, which every locked
 * transaction takes first.
 */
export const LOCK_TIMEOUT_MS = 1500;

/**
 * Discord waits three seconds for the reply, and the reply now waits for the
 * transaction. Both limits together stay inside that, leaving room for the
 * reply itself.
 */
export const LOCKED_TRANSACTION_OPTIONS = {
  maxWait: 500,
  timeout: 2000,
} as const;

/** Postgres's lock_not_available, which a lock_timeout raises. */
const LOCK_NOT_AVAILABLE = "55P03";

function isBusy(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  // P2028: the transaction timed out, or no connection was free to start it.
  if (error.code === "P2028") {
    return true;
  }
  // P2010: a raw query failed; the advisory lock and FOR UPDATE are raw.
  return error.code === "P2010" && error.meta?.code === LOCK_NOT_AVAILABLE;
}

/**
 * A transaction for a command that locks a player: short deadlines, and a
 * `BusyError` for the player instead of a fault when they run out. Nothing
 * commits in that case, so a knock or gifty is not spent.
 */
export async function lockedTransaction<T>(
  db: DatabaseService,
  thrownFrom: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    return await db.$transaction(work, LOCKED_TRANSACTION_OPTIONS);
  } catch (error) {
    if (isBusy(error)) {
      throw new BusyError({
        thrownFrom,
        sourceError: error instanceof Error ? error : undefined,
      });
    }
    throw error;
  }
}
