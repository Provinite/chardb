import { Prisma } from "@chardb/database";
import { BusyError } from "../errors";
import type { DatabaseService } from "../../database/database.service";
import {
  LOCK_TIMEOUT_MS,
  LOCKED_TRANSACTION_OPTIONS,
  lockedTransaction,
} from "./locked-transaction";

const known = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError("failed", {
    code,
    clientVersion: "test",
    meta,
  });

describe("lockedTransaction", () => {
  const run = (failure: unknown) => {
    const db = {
      $transaction: jest.fn().mockRejectedValue(failure),
    } as unknown as DatabaseService;
    return lockedTransaction(db, "Test", () => Promise.resolve("done"));
  };

  it("runs the work with deadlines short enough for Discord", async () => {
    const tx = { tx: true };
    const transaction = jest.fn((fn: (t: unknown) => Promise<unknown>) =>
      fn(tx),
    );
    const db = { $transaction: transaction } as unknown as DatabaseService;
    await expect(
      lockedTransaction(db, "Test", (t) => Promise.resolve(t)),
    ).resolves.toBe(tx);
    expect(transaction).toHaveBeenCalledWith(
      expect.any(Function),
      LOCKED_TRANSACTION_OPTIONS,
    );
    // Leaves room inside Discord's three seconds for the reply itself.
    expect(
      LOCKED_TRANSACTION_OPTIONS.maxWait + LOCKED_TRANSACTION_OPTIONS.timeout,
    ).toBeLessThanOrEqual(2700);
  });

  // Winners queue on the prize pool for up to the lock timeout, so it is as
  // long as the transaction allows, short of the work done once it is theirs.
  it("lets a winner queue for most of the transaction", () => {
    expect(LOCK_TIMEOUT_MS).toBeGreaterThanOrEqual(1800);
    expect(LOCKED_TRANSACTION_OPTIONS.timeout - LOCK_TIMEOUT_MS).toBeGreaterThanOrEqual(
      200,
    );
  });

  // Every knock needs a connection; in a burst it waits in line for one.
  it("waits a while for a connection before answering busy", () => {
    expect(LOCKED_TRANSACTION_OPTIONS.maxWait).toBeGreaterThanOrEqual(700);
  });

  it("answers busy when the transaction timed out or never started", async () => {
    await expect(run(known("P2028"))).rejects.toBeInstanceOf(BusyError);
  });

  it("answers busy when a lock was not free in time", async () => {
    await expect(run(known("P2010", { code: "55P03" }))).rejects.toBeInstanceOf(
      BusyError,
    );
  });

  it("passes any other failure on", async () => {
    const other = known("P2002");
    await expect(run(other)).rejects.toBe(other);
  });
});
