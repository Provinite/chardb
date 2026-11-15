import { ExternalAccountProvider, Prisma } from "@chardb/database";

/**
 * Makes minting currency to external accounts and claiming what waits on
 * them happen one at a time per account (#610).
 *
 * A mint decides inside its transaction whether an account's person is linked
 * and a member, and writes a pending row if not. Without this, a link or join
 * committing between that decision and the mint's commit would look for
 * pending rows before they exist, and the coin would wait forever on someone
 * who will never link or join again.
 *
 * Held until the transaction ends. Taken in sorted order, so two transactions
 * locking overlapping accounts queue rather than deadlock.
 */
export async function lockPendingAccounts(
  tx: Prisma.TransactionClient,
  accounts: Array<{
    provider: ExternalAccountProvider;
    providerAccountId: string;
  }>,
): Promise<void> {
  const keys = [
    ...new Set(
      accounts.map((a) => `pending-owner:${a.provider}:${a.providerAccountId}`),
    ),
  ].sort();
  for (const key of keys) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }
}
