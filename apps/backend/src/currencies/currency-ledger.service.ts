import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  Prisma,
  CurrencyTransactionKind,
  CurrencyTransactionSource,
} from "@chardb/database";
import { DatabaseService } from "../database/database.service";
import {
  CurrencyTransactionFilters,
  MintCurrencyInput,
  BurnCurrencyInput,
  TransferCurrencyInput,
} from "./dto/currency.dto";

/**
 * A Prisma client that may or may not be inside a transaction.
 *
 * Every balance change and the ledger row explaining it are written through
 * the same client, so they commit together. A balance that can move without a
 * ledger row -- or the other way round -- is worse than no ledger, because it
 * looks authoritative while being wrong.
 */
export type DbClient = DatabaseService | Prisma.TransactionClient;

/** The CHECK constraint that stops a balance going negative. */
const NON_NEGATIVE_CONSTRAINT = "currency_balances_amount_non_negative";

/** One recipient and what they are owed by a single event. */
export interface CreditAward {
  userId: string;
  amount: number;
}

export interface CreditOptions {
  currencyId: string;
  awards: CreditAward[];
  /** Member-facing, and the same for every recipient in the batch. */
  reason: string;
  staffNote?: string | null;
  actorUserId: string | null;
  actorLabel?: string | null;
  /**
   * What caused this. Leave unset for a direct staff action; set it, with a
   * sourceId, when another record is responsible -- the pair is enforced by a
   * CHECK constraint.
   */
  source?: CurrencyTransactionSource;
  sourceId?: string | null;
  /** Join the caller's transaction so the credit commits with whatever caused it. */
  tx?: Prisma.TransactionClient;
  /**
   * Drop recipients who are not members instead of refusing the whole batch.
   *
   * For callers where paying is a side effect of something else that must
   * still succeed: approving an upload should not fail because the uploader
   * has since left the community.
   */
  skipNonMembers?: boolean;
}

export interface CreditResult {
  batchId: string;
  paid: CreditAward[];
  /** Named but not paid, because they are not members. */
  skipped: string[];
}

/**
 * Did this error come from the non-negative balance constraint?
 *
 * Prisma has no dedicated error code for a CHECK violation, so this matches on
 * the constraint name -- which is ours, and stable, because the migration names
 * it explicitly rather than letting Postgres generate one.
 */
function isOverdraft(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes(NON_NEGATIVE_CONSTRAINT);
}

@Injectable()
export class CurrencyLedgerService {
  constructor(private readonly db: DatabaseService) {}

  // ==================== Balance mechanics ====================

  /**
   * Make sure a balance row exists, without caring whether it already did.
   *
   * `createMany` with `skipDuplicates` is `INSERT ... ON CONFLICT DO NOTHING`,
   * so two callers racing to open the same member's first balance both
   * succeed: the loser blocks on the conflicting row's lock until the winner
   * commits, then inserts nothing and carries on. No unique violation is
   * raised, which is why this is safe to run inside a caller's transaction.
   *
   * It runs on whichever client it is given, and that matters. Reaching for
   * the pool here while a caller's interactive transaction is open would take
   * a *second* connection per call -- and once enough of those run at once,
   * every connection is held by a transaction waiting for a connection that
   * can never free, until the pool times all of them out.
   *
   * With the row guaranteed present, every balance change downstream is a
   * plain UPDATE, which Postgres serialises on the row lock for free.
   */
  private async ensureBalanceRows(
    client: DbClient,
    currencyId: string,
    userIds: string[],
  ): Promise<void> {
    await client.currencyBalance.createMany({
      data: userIds.map((userId) => ({ currencyId, userId, amount: 0 })),
      skipDuplicates: true,
    });
  }

  /**
   * Apply a signed delta to one balance and return what it became.
   *
   * `UPDATE ... SET amount = amount + $1 ... RETURNING amount` is one
   * statement: the read and the write cannot be separated, so two concurrent
   * spends against the same balance queue behind each other rather than both
   * reading the same stale number. The returned value is what goes into
   * `balanceAfter`, so the ledger records the balance that actually existed
   * rather than one recomputed afterwards.
   */
  private async applyDelta(
    client: DbClient,
    currencyId: string,
    userId: string,
    delta: number,
  ): Promise<number> {
    const row = await client.currencyBalance.update({
      where: { currencyId_userId: { currencyId, userId } },
      data: { amount: { increment: delta } },
      select: { amount: true },
    });
    return row.amount;
  }

  /** Load a currency and refuse to touch one that is archived. */
  private async loadWritableCurrency(client: DbClient, currencyId: string) {
    const currency = await client.currency.findUnique({
      where: { id: currencyId },
    });
    if (!currency) {
      throw new NotFoundException(`Currency ${currencyId} not found`);
    }
    if (currency.archivedAt) {
      throw new BadRequestException(
        `${currency.name} is archived and takes no new transactions`,
      );
    }
    return currency;
  }

  /**
   * Everyone named must be a member of the currency's community.
   *
   * Coin that can land on a non-member is coin that leaves the economy it
   * belongs to, and shows up in a wallet its holder cannot reach.
   */
  private async assertMembers(
    client: DbClient,
    communityId: string,
    userIds: string[],
  ): Promise<void> {
    const unique = [...new Set(userIds)];
    const found = await this.findMembers(client, communityId, unique);
    const missing = unique.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Not a member of this community: ${missing.join(", ")}`,
      );
    }
  }

  /** Which of these users belong to the community. */
  private async findMembers(
    client: DbClient,
    communityId: string,
    userIds: string[],
  ): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    // Membership hangs off the role, not off the community directly: a member
    // row names a role, and the role names the community.
    const members = await client.communityMember.findMany({
      where: { userId: { in: userIds }, role: { communityId } },
      select: { userId: true },
    });
    return new Set(members.map((m) => m.userId));
  }

  // ==================== Movement ====================

  /**
   * Create coin into one or more members' balances, one amount per recipient.
   *
   * The general form behind {@link mint}. Separate amounts matter because a
   * single event can legitimately pay people differently -- approving an
   * upload might award the artist more than the uploader -- and that has to
   * stay ONE batch. Calling mint once per person would scatter a single
   * decision across the ledger as unrelated events.
   */
  async credit(options: CreditOptions): Promise<CreditResult> {
    const {
      currencyId,
      reason,
      staffNote,
      actorUserId,
      actorLabel,
      source = CurrencyTransactionSource.DIRECT,
      sourceId = null,
      tx,
      skipNonMembers = false,
    } = options;

    // Every query below runs on one client: the caller's transaction when
    // there is one, the pool otherwise. Reaching past a caller's transaction
    // to the pool would hold two connections at once, and enough concurrent
    // callers doing that deadlock the pool -- each transaction waiting for a
    // connection only another waiting transaction could release.
    const read: DbClient = tx ?? this.db;

    const currency = await this.loadWritableCurrency(read, currencyId);

    // Merge duplicate recipients rather than paying twice, and sort. Sorting
    // is the deadlock guard: two concurrent batches over overlapping
    // recipients would otherwise take the same row locks in different orders.
    const totals = new Map<string, number>();
    for (const award of options.awards) {
      if (award.amount <= 0) continue;
      totals.set(award.userId, (totals.get(award.userId) ?? 0) + award.amount);
    }
    const requested = [...totals.keys()].sort();

    let userIds = requested;
    let skipped: string[] = [];
    if (skipNonMembers) {
      const members = await this.findMembers(
        read,
        currency.communityId,
        requested,
      );
      userIds = requested.filter((id) => members.has(id));
      skipped = requested.filter((id) => !members.has(id));
    } else {
      await this.assertMembers(read, currency.communityId, requested);
    }

    const batchId = randomUUID();
    if (userIds.length === 0) {
      return { batchId, paid: [], skipped };
    }

    const run = async (client: DbClient) => {
      await this.ensureBalanceRows(client, currency.id, userIds);
      for (const userId of userIds) {
        const amount = totals.get(userId) as number;
        const balanceAfter = await this.applyDelta(
          client,
          currency.id,
          userId,
          amount,
        );
        await client.currencyTransaction.create({
          data: {
            currencyId: currency.id,
            userId,
            kind: CurrencyTransactionKind.MINT,
            amount,
            balanceAfter,
            batchId,
            actorUserId: actorUserId ?? null,
            actorLabel: actorUserId ? null : (actorLabel ?? "system"),
            reason,
            staffNote: staffNote ?? null,
            source,
            sourceId,
          },
        });
      }
    };

    if (tx) {
      await run(tx);
    } else {
      await this.db.$transaction(run);
    }

    return {
      batchId,
      paid: userIds.map((userId) => ({
        userId,
        amount: totals.get(userId) as number,
      })),
      skipped,
    };
  }

  /**
   * Create coin into one or more members' balances.
   *
   * Every recipient's row shares one batch id, so a prize round that pays
   * eleven people reads as one event rather than eleven coincidences.
   */
  async mint(
    input: MintCurrencyInput,
    actorUserId: string | null,
    actorLabel?: string | null,
  ): Promise<string> {
    const { batchId } = await this.credit({
      currencyId: input.currencyId,
      awards: input.userIds.map((userId) => ({
        userId,
        amount: input.amount,
      })),
      reason: input.reason,
      staffNote: input.staffNote,
      actorUserId,
      actorLabel,
    });
    return batchId;
  }

  /**
   * Remove coin from a member's balance.
   *
   * Refuses to take more than they hold rather than driving the balance
   * negative: a negative balance is a debt the app has no concept of, and
   * would silently swallow the member's next earnings.
   */
  async burn(
    input: BurnCurrencyInput,
    actorUserId: string | null,
    actorLabel?: string | null,
  ): Promise<string> {
    const currency = await this.loadWritableCurrency(this.db, input.currencyId);
    await this.assertMembers(this.db, currency.communityId, [input.userId]);

    const batchId = randomUUID();

    try {
      await this.db.$transaction(async (tx) => {
        await this.ensureBalanceRows(tx, currency.id, [input.userId]);
        const balanceAfter = await this.applyDelta(
          tx,
          currency.id,
          input.userId,
          -input.amount,
        );
        await tx.currencyTransaction.create({
          data: {
            currencyId: currency.id,
            userId: input.userId,
            kind: CurrencyTransactionKind.BURN,
            amount: -input.amount,
            balanceAfter,
            batchId,
            actorUserId: actorUserId ?? null,
            actorLabel: actorUserId ? null : (actorLabel ?? "system"),
            reason: input.reason,
            staffNote: input.staffNote ?? null,
          },
        });
      });
    } catch (error) {
      if (isOverdraft(error)) {
        throw new BadRequestException(
          `That member does not hold ${input.amount} ${currency.code}`,
        );
      }
      throw error;
    }

    return batchId;
  }

  /**
   * Move coin from one member to another.
   *
   * Writes two rows sharing a batch id -- one negative for the sender, one
   * positive for the recipient -- so each member's statement reads correctly
   * on its own and the pair can still be collapsed back into a single line.
   */
  async transfer(
    input: TransferCurrencyInput,
    fromUserId: string,
  ): Promise<string> {
    if (input.toUserId === fromUserId) {
      throw new BadRequestException("Cannot transfer currency to yourself");
    }

    const currency = await this.loadWritableCurrency(this.db, input.currencyId);
    await this.assertMembers(this.db, currency.communityId, [
      fromUserId,
      input.toUserId,
    ]);

    const batchId = randomUUID();

    try {
      await this.db.$transaction(async (tx) => {
        await this.ensureBalanceRows(tx, currency.id, [
          fromUserId,
          input.toUserId,
        ]);
        // Touch the two balances in a fixed order, sorted by user id rather
        // than by which side is sending.
        //
        // Each UPDATE holds its row lock until commit. If order followed the
        // direction of the transfer, then A paying B while B pays A would have
        // each transaction holding the row the other needs, and Postgres would
        // break the deadlock by killing one of them. Sorting means every
        // transfer between the same two people queues in the same order.
        //
        // Applying the credit before the debit is safe: if the sender turns
        // out not to cover it, the constraint aborts the whole transaction and
        // the credit goes with it.
        const legs = [
          { userId: fromUserId, delta: -input.amount },
          { userId: input.toUserId, delta: input.amount },
        ].sort((a, b) => (a.userId < b.userId ? -1 : 1));

        let fromBalance = 0;
        let toBalance = 0;
        for (const leg of legs) {
          const after = await this.applyDelta(
            tx,
            currency.id,
            leg.userId,
            leg.delta,
          );
          if (leg.userId === fromUserId) {
            fromBalance = after;
          } else {
            toBalance = after;
          }
        }

        await tx.currencyTransaction.createMany({
          data: [
            {
              currencyId: currency.id,
              userId: fromUserId,
              kind: CurrencyTransactionKind.TRANSFER,
              amount: -input.amount,
              balanceAfter: fromBalance,
              batchId,
              counterpartyId: input.toUserId,
              actorUserId: fromUserId,
              reason: input.reason ?? null,
            },
            {
              currencyId: currency.id,
              userId: input.toUserId,
              kind: CurrencyTransactionKind.TRANSFER,
              amount: input.amount,
              balanceAfter: toBalance,
              batchId,
              counterpartyId: fromUserId,
              actorUserId: fromUserId,
              reason: input.reason ?? null,
            },
          ],
        });
      });
    } catch (error) {
      if (isOverdraft(error)) {
        throw new BadRequestException(
          `You do not have ${input.amount} ${currency.code} to send`,
        );
      }
      throw error;
    }

    return batchId;
  }

  /**
   * Burn coin at a sink -- a shop purchase, an entry fee.
   *
   * Deliberately separate from {@link burn}: a member spending their own coin
   * and staff taking it away are different events, and collapsing them would
   * make a shop look like a punishment in the member's own statement.
   *
   * Currency spent leaves circulation entirely. There is no treasury to
   * receive it, because a treasury balance nobody can see or spend is a number
   * that only ever grows.
   */
  async spend(
    currencyId: string,
    userId: string,
    amount: number,
    reason: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    if (amount <= 0) {
      throw new BadRequestException("Spend amount must be positive");
    }

    const currency = await this.loadWritableCurrency(tx ?? this.db, currencyId);

    const batchId = randomUUID();

    const run = async (client: Prisma.TransactionClient) => {
      await this.ensureBalanceRows(client, currency.id, [userId]);
      const balanceAfter = await this.applyDelta(
        client,
        currency.id,
        userId,
        -amount,
      );
      await client.currencyTransaction.create({
        data: {
          currencyId: currency.id,
          userId,
          kind: CurrencyTransactionKind.SPEND,
          amount: -amount,
          balanceAfter,
          batchId,
          actorUserId: userId,
          reason,
        },
      });
    };

    try {
      if (tx) {
        await run(tx);
      } else {
        await this.db.$transaction(run);
      }
    } catch (error) {
      if (isOverdraft(error)) {
        throw new ConflictException(
          `Not enough ${currency.code}: this costs ${amount}`,
        );
      }
      throw error;
    }

    return batchId;
  }

  // ==================== Reads ====================

  /**
   * Every currency in a community with what this member holds of it.
   *
   * Includes currencies they hold none of. A wallet that lists only non-zero
   * balances cannot tell a member that a currency exists, which is the one
   * thing they need to know before they can go and earn any.
   */
  async findWallet(communityId: string, userId: string) {
    const currencies = await this.db.currency.findMany({
      where: { communityId, archivedAt: null },
      orderBy: { name: "asc" },
    });

    const balances = await this.db.currencyBalance.findMany({
      where: { userId, currencyId: { in: currencies.map((c) => c.id) } },
    });
    const byCurrency = new Map(balances.map((b) => [b.currencyId, b]));

    return {
      userId,
      communityId,
      balances: currencies.map((currency) => {
        const held = byCurrency.get(currency.id);
        return {
          currency,
          amount: held?.amount ?? 0,
          updatedAt: held?.updatedAt ?? null,
        };
      }),
    };
  }

  /** One member's statement for one currency, or all of them. */
  async findTransactions(filters: CurrencyTransactionFilters) {
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;

    const where: Prisma.CurrencyTransactionWhereInput = {
      currency: { communityId: filters.communityId },
      ...(filters.currencyId ? { currencyId: filters.currencyId } : {}),
      ...(filters.kinds?.length ? { kind: { in: filters.kinds } } : {}),
      ...(filters.userId
        ? {
            OR: [
              { userId: filters.userId },
              { counterpartyId: filters.userId },
              { actorUserId: filters.userId },
            ],
          }
        : {}),
      // staffNote is deliberately absent from this list. Letting a member
      // search it would let them probe for the contents of a note they are
      // not allowed to read, one guess at a time.
      ...(filters.search
        ? {
            OR: [
              { reason: { contains: filters.search, mode: "insensitive" } },
              {
                currency: {
                  communityId: filters.communityId,
                  name: { contains: filters.search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };

    const [transactions, total] = await Promise.all([
      this.db.currencyTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.db.currencyTransaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      hasMore: offset + transactions.length < total,
    };
  }

  /**
   * Who holds a currency, largest first.
   *
   * Zero balances are excluded here, unlike in a wallet: this answers "where
   * did the coin go", and a member holding none is not part of that answer.
   */
  async findHolders(currencyId: string, limit = 50, offset = 0) {
    // Clamped here rather than on the resolver argument. `limit` arrives as a
    // bare Int arg, not a field on an @InputType, so the validation pipe that
    // caps the ledger's page size at 100 never runs on it -- an unclamped
    // `take` would let any member ask for every balance in one query. Doing it
    // in the service also covers callers that never touch the resolver.
    const take = Math.min(Math.max(Math.trunc(limit) || 0, 1), 100);
    const skip = Math.max(Math.trunc(offset) || 0, 0);

    const where: Prisma.CurrencyBalanceWhereInput = {
      currencyId,
      amount: { gt: 0 },
    };

    const [balances, total] = await Promise.all([
      this.db.currencyBalance.findMany({
        where,
        orderBy: [{ amount: "desc" }, { updatedAt: "asc" }],
        take,
        skip,
        include: { currency: true },
      }),
      this.db.currencyBalance.count({ where }),
    ]);

    return { balances, total, hasMore: skip + balances.length < total };
  }
}
