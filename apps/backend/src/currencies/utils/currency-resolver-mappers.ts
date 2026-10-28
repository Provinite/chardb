import type {
  Currency as PrismaCurrency,
  CurrencyTransaction as PrismaCurrencyTransaction,
} from "@chardb/database";
import { Currency } from "../entities/currency.entity";
import {
  CurrencyTransaction,
  CurrencyTransactionConnection,
} from "../entities/currency-transaction.entity";
import type { CurrencyTransactionFilters } from "../dto/currency.dto";

export function mapPrismaCurrencyToGraphQL(row: PrismaCurrency): Currency {
  return {
    id: row.id,
    communityId: row.communityId,
    name: row.name,
    code: row.code,
    symbol: row.symbol,
    description: row.description,
    colorId: row.colorId,
    isTradeable: row.isTradeable,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * `staffNote` is absent from the returned object on purpose.
 *
 * It is resolved per viewer by a field resolver, which re-reads it from the
 * database only after checking permissions. Mapping it here would put the
 * value on every entity and make leaking it the default outcome of forgetting
 * to strip it.
 */
export function mapPrismaCurrencyTransactionToGraphQL(
  row: PrismaCurrencyTransaction,
): CurrencyTransaction {
  return {
    id: row.id,
    currencyId: row.currencyId,
    userId: row.userId,
    kind: row.kind,
    amount: row.amount,
    balanceAfter: row.balanceAfter,
    batchId: row.batchId,
    counterpartyId: row.counterpartyId,
    actorUserId: row.actorUserId,
    actorLabel: row.actorLabel,
    reason: row.reason,
    source: row.source,
    sourceId: row.sourceId,
    createdAt: row.createdAt,
  };
}

export function mapPrismaCurrencyTransactionConnectionToGraphQL(
  result: {
    transactions: PrismaCurrencyTransaction[];
    hasMore: boolean;
  },
  filters: CurrencyTransactionFilters,
): CurrencyTransactionConnection {
  return {
    transactions: result.transactions.map(
      mapPrismaCurrencyTransactionToGraphQL,
    ),
    hasMore: result.hasMore,
    filters,
  };
}
