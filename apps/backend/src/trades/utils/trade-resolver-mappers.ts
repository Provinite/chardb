import { Prisma, TradeStatus } from "@chardb/database";
import {
  EffectiveTradeStatus,
  Trade,
  TradeCurrencyLine,
  TradeItem,
} from "../entities/trade.entity";
import { TRADE_INCLUDE } from "../trades.service";
import { mapPrismaItemToGraphQL } from "../../items/utils/item-resolver-mappers";
import { mapPrismaItemTypeToGraphQL } from "../../items/utils/item-type-resolver-mappers";
import { mapPrismaCurrencyToGraphQL } from "../../currencies/utils/currency-resolver-mappers";
import { mapPrismaUserToGraphQL } from "../../users/utils/user-resolver-mappers";
import { mapPrismaCommunityToGraphQL } from "../../communities/utils/community-resolver-mappers";

/**
 * The shape the service loads.
 *
 * Derived from the service's own include rather than restated, so the two
 * cannot drift into disagreeing about what a loaded trade contains.
 */
export type PrismaTradeWithRelations = Prisma.TradeGetPayload<{
  include: typeof TRADE_INCLUDE;
}>;

/**
 * The status a reader should act on.
 *
 * Expiry is a date, so a PENDING row whose date has passed reports EXPIRED here
 * rather than being written back by a job. A status that needs sweeping is
 * wrong for as long as the sweeper is late.
 */
export function effectiveTradeStatus(trade: {
  status: TradeStatus;
  expiresAt: Date;
}): EffectiveTradeStatus {
  switch (trade.status) {
    case TradeStatus.ACCEPTED:
      return EffectiveTradeStatus.ACCEPTED;
    case TradeStatus.DECLINED:
      return EffectiveTradeStatus.DECLINED;
    case TradeStatus.CANCELLED:
      return EffectiveTradeStatus.CANCELLED;
    case TradeStatus.PENDING:
      return trade.expiresAt.getTime() <= Date.now()
        ? EffectiveTradeStatus.EXPIRED
        : EffectiveTradeStatus.PENDING;
  }
}

function mapItemLine(
  line: PrismaTradeWithRelations["items"][number],
): TradeItem {
  return {
    id: line.id,
    item: line.item ? mapPrismaItemToGraphQL(line.item) : null,
    itemType: line.itemType ? mapPrismaItemTypeToGraphQL(line.itemType) : null,
    quantity: line.quantity,
    sourceUser: mapPrismaUserToGraphQL(line.sourceUser),
    destinationUser: mapPrismaUserToGraphQL(line.destinationUser),
  };
}

function mapCurrencyLine(
  line: PrismaTradeWithRelations["currencyLines"][number],
): TradeCurrencyLine {
  return {
    id: line.id,
    currency: mapPrismaCurrencyToGraphQL(line.currency),
    amount: line.amount,
    sourceUser: mapPrismaUserToGraphQL(line.sourceUser),
    destinationUser: mapPrismaUserToGraphQL(line.destinationUser),
  };
}

export function mapTradeToGraphQL(trade: PrismaTradeWithRelations): Trade {
  return {
    id: trade.id,
    community: mapPrismaCommunityToGraphQL(trade.community),
    proposer: mapPrismaUserToGraphQL(trade.proposer),
    recipient: mapPrismaUserToGraphQL(trade.recipient),
    status: effectiveTradeStatus(trade),
    note: trade.note,
    expiresAt: trade.expiresAt,
    respondedAt: trade.respondedAt,
    settlementBatchId: trade.settlementBatchId,
    createdAt: trade.createdAt,
    items: trade.items.map(mapItemLine),
    currencyLines: trade.currencyLines.map(mapCurrencyLine),
  };
}
