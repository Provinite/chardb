import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  ItemTransactionKind,
  Prisma,
  TradeStatus,
  NotificationKind,
  NotificationSubjectType,
} from "@chardb/database";
import { DatabaseService } from "../database/database.service";
import { ItemTransactionsService } from "../item-transactions/item-transactions.service";
import { CurrencyLedgerService } from "../currencies/currency-ledger.service";
import { NotificationsService } from "../notifications/notifications.service";

/** How long an offer stands when the proposer does not say otherwise. */
const DEFAULT_EXPIRY_DAYS = 7;

/** A trade loaded with everything settlement needs to check and move. */
type TradeForResponse = Prisma.TradeGetPayload<{
  include: {
    items: { include: { item: { include: { itemType: true } } } };
    currencyLines: true;
  };
}>;

/** Group by a key, preserving insertion order. */
function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = out.get(k);
    if (bucket) bucket.push(row);
    else out.set(k, [row]);
  }
  return out;
}

/** One item the proposer wants to put on the table, and which way it goes. */
export interface TradeItemInput {
  itemId: string;
  /** True when the proposer is handing it over, false when they are asking for it. */
  fromProposer: boolean;
}

/** Coin on the table, in one direction. */
export interface TradeCoinInput {
  currencyId: string;
  amount: number;
  fromProposer: boolean;
}

export interface CreateTradeInput {
  communityId: string;
  recipientId: string;
  items: TradeItemInput[];
  coin: TradeCoinInput[];
  note?: string | null;
  expiresInDays?: number;
}

/**
 * A trade as it stands now, with expiry applied.
 *
 * `TradeStatus` has no EXPIRED member -- expiry is a date, not a stored state --
 * so this is what every reader should see instead of the raw column.
 */
export type EffectiveTradeStatus = TradeStatus | "EXPIRED";

/** What a pending trade's status actually is, once the clock is consulted. */
export function effectiveStatus(trade: {
  status: TradeStatus;
  expiresAt: Date;
}): EffectiveTradeStatus {
  if (trade.status !== TradeStatus.PENDING) return trade.status;
  return trade.expiresAt.getTime() <= Date.now() ? "EXPIRED" : trade.status;
}

@Injectable()
export class TradesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly itemTransactions: ItemTransactionsService,
    private readonly currencyLedger: CurrencyLedgerService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Compose an offer.
   *
   * Nothing is reserved. Every check here is advisory -- it exists so the
   * proposer is told immediately rather than at settlement -- and every one of
   * them is made again, authoritatively, when the recipient accepts.
   */
  async create(proposerId: string, input: CreateTradeInput) {
    if (input.recipientId === proposerId) {
      throw new BadRequestException("You cannot trade with yourself");
    }
    if (input.items.length === 0 && input.coin.length === 0) {
      throw new BadRequestException("A trade needs something on the table");
    }

    await this.assertMembers(input.communityId, [
      proposerId,
      input.recipientId,
    ]);

    const lines = await this.resolveItemLines(
      input.communityId,
      proposerId,
      input.recipientId,
      input.items,
    );
    const coinLines = await this.resolveCoinLines(
      input.communityId,
      proposerId,
      input.recipientId,
      input.coin,
    );

    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + (input.expiresInDays ?? DEFAULT_EXPIRY_DAYS),
    );

    const trade = await this.db.trade.create({
      data: {
        communityId: input.communityId,
        proposerId,
        recipientId: input.recipientId,
        note: input.note?.trim() || null,
        expiresAt,
        items: { create: lines },
        currencyLines: { create: coinLines },
      },
      include: { items: true, currencyLines: true },
    });

    await this.notifyRecipient(trade.id, proposerId, input);

    return trade;
  }

  /**
   * Turn the requested items into stored lines.
   *
   * The source and destination are decided here, from who currently owns the
   * item, and never taken from the client -- the client says "this item, this
   * way", not "this item, from this person".
   */
  private async resolveItemLines(
    communityId: string,
    proposerId: string,
    recipientId: string,
    requested: TradeItemInput[],
  ): Promise<Prisma.TradeItemUncheckedCreateWithoutTradeInput[]> {
    if (requested.length === 0) return [];

    const ids = requested.map((r) => r.itemId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException("The same item is on the table twice");
    }

    const items = await this.db.item.findMany({
      where: { id: { in: ids }, destroyedAt: null },
      include: {
        itemType: {
          select: { communityId: true, isTradeable: true, name: true },
        },
      },
    });
    if (items.length !== ids.length) {
      throw new BadRequestException(
        "One or more of those items does not exist or has been destroyed",
      );
    }

    return requested.map((r) => {
      const item = items.find((i) => i.id === r.itemId);
      if (!item) {
        throw new BadRequestException(`Item ${r.itemId} is not available`);
      }
      if (item.itemType.communityId !== communityId) {
        throw new BadRequestException(
          `${item.itemType.name} belongs to another community`,
        );
      }
      if (!item.itemType.isTradeable) {
        throw new BadRequestException(`${item.itemType.name} cannot be traded`);
      }

      const owner = r.fromProposer ? proposerId : recipientId;
      if (item.ownerId !== owner) {
        throw new BadRequestException(
          `${item.itemType.name} is not held by the side offering it`,
        );
      }

      return {
        itemId: item.id,
        sourceUserId: owner,
        destinationUserId: r.fromProposer ? recipientId : proposerId,
      };
    });
  }

  /**
   * Turn the requested coin into stored lines, netting opposing amounts.
   *
   * "Give 250, ask 100 back" is one line of 150. Coin is fungible, so the two
   * halves have no separate meaning, and storing both would leave the ledger
   * describing a round trip that never happened.
   */
  private async resolveCoinLines(
    communityId: string,
    proposerId: string,
    recipientId: string,
    requested: TradeCoinInput[],
  ): Promise<Prisma.TradeCurrencyLineUncheckedCreateWithoutTradeInput[]> {
    if (requested.length === 0) return [];

    // Signed from the proposer while netting; the sign becomes a direction again
    // on the way out.
    const net = new Map<string, number>();
    for (const line of requested) {
      if (!Number.isInteger(line.amount) || line.amount <= 0) {
        throw new BadRequestException(
          "Coin amounts must be whole and positive",
        );
      }
      const delta = line.fromProposer ? line.amount : -line.amount;
      net.set(line.currencyId, (net.get(line.currencyId) ?? 0) + delta);
    }

    const currencyIds = [...net.keys()];
    const currencies = await this.db.currency.findMany({
      where: { id: { in: currencyIds }, communityId, archivedAt: null },
      select: { id: true },
    });
    if (currencies.length !== currencyIds.length) {
      throw new BadRequestException(
        "One or more of those currencies does not belong to this community, or is archived",
      );
    }

    return (
      [...net.entries()]
        // A currency that nets to zero is not on the table at all.
        .filter(([, delta]) => delta !== 0)
        .map(([currencyId, delta]) => ({
          currencyId,
          amount: Math.abs(delta),
          sourceUserId: delta > 0 ? proposerId : recipientId,
          destinationUserId: delta > 0 ? recipientId : proposerId,
        }))
    );
  }

  private async assertMembers(communityId: string, userIds: string[]) {
    const count = await this.db.communityMember.count({
      where: { userId: { in: userIds }, role: { communityId } },
    });
    if (count < userIds.length) {
      throw new BadRequestException(
        "Both members must belong to this community",
      );
    }
  }

  /**
   * Accept an offer and settle it.
   *
   * Everything happens in one transaction across both ledgers. A trade that
   * half-commits -- items moved, coin not, or either ledger disagreeing with
   * what actually changed hands -- is the failure that destroys trust in an
   * economy, and it is far better to fail the whole accept.
   *
   * Every check the composer made is made again here, because nothing was
   * reserved in between. An item may have been traded away, consumed or
   * revoked; a balance may have been spent. That is the cost of not escrowing,
   * and this is where it is paid.
   */
  async accept(tradeId: string, userId: string) {
    const trade = await this.loadForResponse(tradeId);

    if (trade.recipientId !== userId) {
      throw new ForbiddenException("Only the recipient can accept this trade");
    }

    const batchId = randomUUID();

    return this.db.$transaction(async (tx) => {
      // Re-read inside the transaction and re-check the status. Two accepts
      // arriving together would otherwise both pass the check above and settle
      // the same trade twice.
      const current = await tx.trade.findUnique({
        where: { id: tradeId },
        select: { status: true, expiresAt: true },
      });
      if (!current || current.status !== TradeStatus.PENDING) {
        throw new BadRequestException("That trade is no longer open");
      }
      if (effectiveStatus(current) === "EXPIRED") {
        throw new BadRequestException("That offer has expired");
      }

      await this.moveItems(tx, trade, batchId);
      await this.moveCoin(tx, trade, batchId);

      return tx.trade.update({
        where: { id: tradeId },
        data: {
          status: TradeStatus.ACCEPTED,
          respondedAt: new Date(),
          settlementBatchId: batchId,
        },
        include: { items: true, currencyLines: true },
      });
    });
  }

  /**
   * Move every item named by the trade, and write the ledger rows for it.
   *
   * The update is conditional on the item still being owned by the side that
   * offered it and still being alive. Checking and then writing would leave a
   * window; making the WHERE clause carry the check means a concurrent transfer
   * loses the race rather than being overwritten by it.
   */
  private async moveItems(
    tx: Prisma.TransactionClient,
    trade: TradeForResponse,
    batchId: string,
  ) {
    for (const line of trade.items) {
      const { count } = await tx.item.updateMany({
        where: {
          id: line.itemId,
          ownerId: line.sourceUserId,
          destroyedAt: null,
        },
        data: { ownerId: line.destinationUserId },
      });

      if (count !== 1) {
        throw new BadRequestException(
          `${line.item.itemType.name} is no longer available from the member offering it`,
        );
      }
    }

    if (trade.items.length === 0) return;

    // One ledger event per direction, so a two-way trade reads as two batches
    // of movement rather than a pile of unrelated rows.
    for (const [sourceUserId, lines] of groupBy(
      trade.items,
      (l) => l.sourceUserId,
    )) {
      const byType = groupBy(lines, (l) => l.item.itemTypeId);
      for (const [itemTypeId, typeLines] of byType) {
        await this.itemTransactions.recordBatch(
          {
            communityId: trade.communityId,
            itemTypeId,
            itemIds: typeLines.map((l) => l.itemId),
            kind: ItemTransactionKind.TRANSFER,
            fromUserId: sourceUserId,
            toUserId: typeLines[0].destinationUserId,
            actorUserId: trade.recipientId,
            reason: `Trade settled`,
            batchId,
          },
          tx,
        );
      }
    }
  }

  /** Move every coin line, on the same transaction and the same batch id. */
  private async moveCoin(
    tx: Prisma.TransactionClient,
    trade: TradeForResponse,
    batchId: string,
  ) {
    for (const line of trade.currencyLines) {
      await this.currencyLedger.transfer(
        {
          currencyId: line.currencyId,
          toUserId: line.destinationUserId,
          amount: line.amount,
          reason: `Trade settled`,
        },
        line.sourceUserId,
        { tx, batchId },
      );
    }
  }

  /** The recipient says no. Nothing was held, so nothing is released. */
  async decline(tradeId: string, userId: string) {
    const trade = await this.loadForResponse(tradeId);
    if (trade.recipientId !== userId) {
      throw new ForbiddenException("Only the recipient can decline this trade");
    }
    return this.close(tradeId, TradeStatus.DECLINED);
  }

  /** The proposer withdraws it. */
  async cancel(tradeId: string, userId: string) {
    const trade = await this.loadForResponse(tradeId);
    if (trade.proposerId !== userId) {
      throw new ForbiddenException("Only the proposer can cancel this trade");
    }
    return this.close(tradeId, TradeStatus.CANCELLED);
  }

  private async close(tradeId: string, status: TradeStatus) {
    const { count } = await this.db.trade.updateMany({
      where: { id: tradeId, status: TradeStatus.PENDING },
      data: { status, respondedAt: new Date() },
    });
    if (count !== 1) {
      throw new BadRequestException("That trade is no longer open");
    }
    return this.db.trade.findUniqueOrThrow({
      where: { id: tradeId },
      include: { items: true, currencyLines: true },
    });
  }

  /**
   * Load a trade with everything settlement needs, and refuse the ones that
   * cannot be answered at all.
   */
  private async loadForResponse(tradeId: string) {
    const trade = await this.db.trade.findUnique({
      where: { id: tradeId },
      include: {
        items: { include: { item: { include: { itemType: true } } } },
        currencyLines: true,
      },
    });
    if (!trade) throw new NotFoundException("Trade not found");
    if (trade.status !== TradeStatus.PENDING) {
      throw new BadRequestException("That trade has already been answered");
    }
    return trade;
  }

  private async notifyRecipient(
    tradeId: string,
    proposerId: string,
    input: CreateTradeInput,
  ) {
    await this.notifications.create({
      recipientId: input.recipientId,
      kind: NotificationKind.TRADE_OFFERED,
      actorUserId: proposerId,
      communityId: input.communityId,
      subjectType: NotificationSubjectType.TRADE,
      subjectId: tradeId,
      body: input.note?.trim() || null,
      data: {
        itemCount: input.items.length,
        currencyCount: input.coin.length,
      },
    });
  }
}
