import { ItemTransaction as PrismaItemTransaction } from "@chardb/database";

type WithBatchSize = PrismaItemTransaction & { batchSize: number };
import {
  ItemTransaction,
  ItemTransactionConnection,
} from "../entities/item-transaction.entity";
import type { ItemTransactionFilters } from "../dto/item-transaction.dto";

/**
 * staffNote is intentionally dropped here. It never rides along on the mapped
 * entity; the resolver re-reads it per viewer so the permission check cannot be
 * skipped by a caller that forgets to null it.
 */
export function mapPrismaItemTransactionToGraphQL(
  transaction: WithBatchSize,
): ItemTransaction {
  return {
    id: transaction.id,
    communityId: transaction.communityId,
    itemTypeId: transaction.itemTypeId,
    itemId: transaction.itemId,
    kind: transaction.kind,
    batchId: transaction.batchId,
    batchSize: transaction.batchSize,
    fromUserId: transaction.fromUserId,
    toUserId: transaction.toUserId,
    actorUserId: transaction.actorUserId,
    actorLabel: transaction.actorLabel,
    reason: transaction.reason,
    createdAt: transaction.createdAt,
  };
}

export function mapPrismaItemTransactionConnectionToGraphQL(
  result: {
    transactions: WithBatchSize[];
    hasMore: boolean;
  },
  filters: ItemTransactionFilters,
): ItemTransactionConnection {
  return {
    transactions: result.transactions.map(mapPrismaItemTransactionToGraphQL),
    hasMore: result.hasMore,
    filters,
  };
}
