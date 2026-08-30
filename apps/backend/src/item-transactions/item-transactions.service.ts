import { Injectable, BadRequestException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Prisma, ItemTransactionSource } from "@chardb/database";
import { DatabaseService } from "../database/database.service";
import {
  ItemTransactionFilters,
  RecordItemBatchInput,
} from "./dto/item-transaction.dto";

/**
 * A Prisma client that may or may not be inside a transaction.
 *
 * Every write path passes its transaction client here so the ledger rows and
 * the item mutation commit together. A ledger that can be written without the
 * items changing -- or the other way round -- is worse than no ledger, because
 * it looks authoritative while being wrong.
 */
export type DbClient = DatabaseService | Prisma.TransactionClient;

@Injectable()
export class ItemTransactionsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Append one row per item for a single event.
   *
   * Every row shares a `batchId`, which is what lets a reader collapse twelve
   * identical grants back into "Granted 12" on an exact key rather than by
   * guessing from matching timestamps.
   *
   * @param tx The transaction client from the surrounding item mutation.
   * @returns The batch id, so a caller can reference the event it just wrote.
   */
  async recordBatch(
    input: RecordItemBatchInput,
    tx?: DbClient,
  ): Promise<string> {
    const client = tx ?? this.db;

    if (input.itemIds.length === 0) {
      throw new BadRequestException(
        "An item transaction batch must name at least one item",
      );
    }
    if (!input.actorUserId && !input.actorLabel) {
      throw new BadRequestException(
        "An item transaction needs either an actor user or an actor label",
      );
    }

    const batchId = input.batchId ?? randomUUID();

    await client.itemTransaction.createMany({
      data: input.itemIds.map((itemId) => ({
        communityId: input.communityId,
        itemTypeId: input.itemTypeId,
        itemId,
        kind: input.kind,
        batchId,
        fromUserId: input.fromUserId ?? null,
        toUserId: input.toUserId ?? null,
        actorUserId: input.actorUserId ?? null,
        actorLabel: input.actorUserId ? null : (input.actorLabel ?? null),
        reason: input.reason ?? null,
        staffNote: input.staffNote ?? null,
        source: input.source ?? ItemTransactionSource.DIRECT,
        sourceId: input.sourceId ?? null,
      })),
    });

    return batchId;
  }

  /**
   * Annotate rows with the true size of the batch they belong to.
   *
   * The frontend collapses a batch into one line, and counting the rows it
   * happens to have loaded is wrong the moment a batch straddles a page
   * boundary -- the migration writes one batch per pre-existing item, so the
   * very first page of a real ledger would otherwise read "+25" for a batch of
   * several hundred. One extra grouped count per page buys the honest number.
   */
  private async withBatchSizes<T extends { batchId: string }>(
    rows: T[],
  ): Promise<(T & { batchSize: number })[]> {
    if (rows.length === 0) return [];

    const batchIds = [...new Set(rows.map((r) => r.batchId))];
    const counts = await this.db.itemTransaction.groupBy({
      by: ["batchId"],
      where: { batchId: { in: batchIds } },
      _count: { _all: true },
    });
    const sizeByBatch = new Map(counts.map((c) => [c.batchId, c._count._all]));

    return rows.map((r) => ({
      ...r,
      batchSize: sizeByBatch.get(r.batchId) ?? 1,
    }));
  }

  private buildWhere(
    filters: ItemTransactionFilters,
  ): Prisma.ItemTransactionWhereInput {
    const { communityId, kinds, itemTypeId, itemId, userId, search } = filters;

    return {
      AND: [
        { communityId },
        kinds && kinds.length ? { kind: { in: kinds } } : {},
        itemTypeId ? { itemTypeId } : {},
        itemId ? { itemId } : {},
        userId
          ? {
              OR: [
                { fromUserId: userId },
                { toUserId: userId },
                { actorUserId: userId },
              ],
            }
          : {},
        search
          ? {
              // staffNote is absent from this OR on purpose. Including it would
              // let a member without item permissions confirm the contents of a
              // note they are never allowed to read.
              OR: [
                { reason: { contains: search, mode: "insensitive" } },
                { actorLabel: { contains: search, mode: "insensitive" } },
                {
                  itemType: {
                    name: { contains: search, mode: "insensitive" },
                  },
                },
              ],
            }
          : {},
      ],
    };
  }

  async findAll(filters: ItemTransactionFilters) {
    const { limit = 25, offset = 0 } = filters;
    const where = this.buildWhere(filters);

    const [transactions, total] = await Promise.all([
      this.db.itemTransaction.findMany({
        where,
        skip: offset,
        take: limit,
        // id breaks ties: every row of one batch shares a timestamp, and an
        // unstable sort would let a row repeat or vanish across pages.
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
      this.db.itemTransaction.count({ where }),
    ]);

    return {
      transactions: await this.withBatchSizes(transactions),
      total,
      hasMore: offset + transactions.length < total,
    };
  }

  /** Every row for one item, oldest first -- the provenance timeline. */
  async findByItem(itemId: string) {
    const rows = await this.db.itemTransaction.findMany({
      where: { itemId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return this.withBatchSizes(rows);
  }
}
