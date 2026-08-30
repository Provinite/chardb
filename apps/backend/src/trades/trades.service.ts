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
    items: {
      include: {
        item: { include: { itemType: true } };
        itemType: true;
      };
    };
    currencyLines: true;
  };
}>;

/**
 * One row actually changing hands, after by-type lines have been resolved
 * against what the recipient chose.
 */
interface ResolvedMove {
  itemId: string;
  itemTypeId: string;
  /** For error messages, which are read by whoever is standing at the accept. */
  typeName: string;
  sourceUserId: string;
  destinationUserId: string;
}

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

/**
 * Something the proposer is handing over. Always a specific row: they are at
 * the composer, so they are the giver who gets to choose.
 */
export interface TradeOfferedItemInput {
  itemId: string;
}

/**
 * Something the proposer is asking for.
 *
 * By type is the default and the sensible one -- items of a type differ only by
 * history, so pinning a row makes the offer fail for a reason neither party can
 * see when an identical one is sitting right there. Naming a row is the escape
 * hatch for when that history is the point.
 */
export type TradeRequestedItemInput =
  | { itemTypeId: string; quantity: number }
  | { itemId: string };

/** Coin on the table, in one direction. */
export interface TradeCoinInput {
  currencyId: string;
  amount: number;
  fromProposer: boolean;
}

export interface CreateTradeInput {
  communityId: string;
  recipientId: string;
  /** Rows the proposer hands over. */
  offering: TradeOfferedItemInput[];
  /** What the proposer wants back, by type unless a row is named. */
  requesting: TradeRequestedItemInput[];
  coin: TradeCoinInput[];
  note?: string | null;
  expiresInDays?: number;
}

/**
 * Which rows the recipient hands over to satisfy a by-type line.
 *
 * The giver chooses, and the recipient is the giver who has not chosen yet.
 */
export interface TradeSelection {
  tradeItemId: string;
  itemIds: string[];
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
    if (
      input.offering.length === 0 &&
      input.requesting.length === 0 &&
      input.coin.length === 0
    ) {
      throw new BadRequestException("A trade needs something on the table");
    }

    await this.assertMembers(input.communityId, [
      proposerId,
      input.recipientId,
    ]);

    const lines = [
      ...(await this.resolveOfferedLines(
        input.communityId,
        proposerId,
        input.recipientId,
        input.offering,
      )),
      ...(await this.resolveRequestedLines(
        input.communityId,
        proposerId,
        input.recipientId,
        input.requesting,
      )),
    ];
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
   * Turn what the proposer is handing over into stored lines.
   *
   * Always by row. The proposer is at the composer, so they are the giver who
   * gets to choose, and choosing is exactly what naming a row is.
   *
   * This is also where an item is stopped from being promised twice. Nothing is
   * escrowed, so an item can sit in several of your own open offers and settle
   * against whichever is accepted first -- leaving the rest to fail at accept,
   * in front of the other party, for a reason they cannot see. Refusing at
   * compose time moves that conversation to the person who caused it.
   */
  private async resolveOfferedLines(
    communityId: string,
    proposerId: string,
    recipientId: string,
    offering: TradeOfferedItemInput[],
  ): Promise<Prisma.TradeItemUncheckedCreateWithoutTradeInput[]> {
    if (offering.length === 0) return [];

    const ids = offering.map((o) => o.itemId);
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

    const alreadyPromised = await this.db.tradeItem.findFirst({
      where: {
        itemId: { in: ids },
        sourceUserId: proposerId,
        trade: {
          status: TradeStatus.PENDING,
          expiresAt: { gt: new Date() },
          proposerId,
        },
      },
      include: { item: { include: { itemType: { select: { name: true } } } } },
    });
    if (alreadyPromised?.item) {
      throw new BadRequestException(
        `You have already offered that ${alreadyPromised.item.itemType.name} in another open trade`,
      );
    }

    return items.map((item) => {
      if (item.itemType.communityId !== communityId) {
        throw new BadRequestException(
          `${item.itemType.name} belongs to another community`,
        );
      }
      if (!item.itemType.isTradeable) {
        throw new BadRequestException(`${item.itemType.name} cannot be traded`);
      }
      if (item.ownerId !== proposerId) {
        throw new BadRequestException(`You do not hold ${item.itemType.name}`);
      }

      return {
        itemId: item.id,
        sourceUserId: proposerId,
        destinationUserId: recipientId,
      };
    });
  }

  /**
   * Turn what the proposer is asking for into stored lines.
   *
   * By type unless a row is named. Two by-type lines for the same type are one
   * line with a larger quantity, so they merge here rather than becoming two
   * selections the recipient has to satisfy separately.
   *
   * Nothing about the recipient's holdings is reserved, and deliberately so --
   * reserving someone else's property because you asked for it is escrow with
   * extra steps. What by-type buys is that the offer survives them trading away
   * any particular copy.
   */
  private async resolveRequestedLines(
    communityId: string,
    proposerId: string,
    recipientId: string,
    requesting: TradeRequestedItemInput[],
  ): Promise<Prisma.TradeItemUncheckedCreateWithoutTradeInput[]> {
    if (requesting.length === 0) return [];

    const byRow = requesting.filter(
      (r): r is { itemId: string } => "itemId" in r,
    );
    const byType = requesting.filter(
      (r): r is { itemTypeId: string; quantity: number } => "itemTypeId" in r,
    );

    const lines: Prisma.TradeItemUncheckedCreateWithoutTradeInput[] = [];

    if (byRow.length) {
      const ids = byRow.map((r) => r.itemId);
      if (new Set(ids).size !== ids.length) {
        throw new BadRequestException("The same item is requested twice");
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
      for (const item of items) {
        if (item.itemType.communityId !== communityId) {
          throw new BadRequestException(
            `${item.itemType.name} belongs to another community`,
          );
        }
        if (!item.itemType.isTradeable) {
          throw new BadRequestException(
            `${item.itemType.name} cannot be traded`,
          );
        }
        if (item.ownerId !== recipientId) {
          throw new BadRequestException(
            `${item.itemType.name} is not held by the member you are asking`,
          );
        }
        lines.push({
          itemId: item.id,
          sourceUserId: recipientId,
          destinationUserId: proposerId,
        });
      }
    }

    if (byType.length) {
      const merged = new Map<string, number>();
      for (const r of byType) {
        if (!Number.isInteger(r.quantity) || r.quantity <= 0) {
          throw new BadRequestException(
            "Quantities must be whole and positive",
          );
        }
        merged.set(r.itemTypeId, (merged.get(r.itemTypeId) ?? 0) + r.quantity);
      }

      const types = await this.db.itemType.findMany({
        where: { id: { in: [...merged.keys()] }, communityId },
        select: { id: true, name: true, isTradeable: true },
      });
      if (types.length !== merged.size) {
        throw new BadRequestException(
          "One or more of those item types does not belong to this community",
        );
      }
      for (const type of types) {
        if (!type.isTradeable) {
          throw new BadRequestException(`${type.name} cannot be traded`);
        }
        lines.push({
          itemTypeId: type.id,
          quantity: merged.get(type.id) as number,
          sourceUserId: recipientId,
          destinationUserId: proposerId,
        });
      }
    }

    return lines;
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
  async accept(
    tradeId: string,
    userId: string,
    selections: TradeSelection[] = [],
  ) {
    const trade = await this.loadForResponse(tradeId);

    if (trade.recipientId !== userId) {
      throw new ForbiddenException("Only the recipient can accept this trade");
    }

    const resolved = this.resolveSelections(trade, selections);
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

      await this.moveItems(tx, trade, resolved, batchId);
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
   * Turn every line into the concrete rows that will move.
   *
   * A by-row line already is one. A by-type line is satisfied by whatever the
   * recipient chose, which is checked here for count, ownership and type --
   * a selection is a claim about someone's own property, so it is verified
   * rather than trusted.
   */
  private resolveSelections(
    trade: TradeForResponse,
    selections: TradeSelection[],
  ): ResolvedMove[] {
    const chosen = new Map(selections.map((s) => [s.tradeItemId, s.itemIds]));
    const moves: ResolvedMove[] = [];
    const seen = new Set<string>();

    for (const line of trade.items) {
      if (line.itemId) {
        moves.push({
          itemId: line.itemId,
          itemTypeId: line.item?.itemTypeId as string,
          typeName: line.item?.itemType.name ?? "That item",
          sourceUserId: line.sourceUserId,
          destinationUserId: line.destinationUserId,
        });
        continue;
      }

      const picks = chosen.get(line.id) ?? [];
      const wanted = line.quantity as number;
      const typeName = line.itemType?.name ?? "that item";

      if (picks.length !== wanted) {
        throw new BadRequestException(
          `Choose exactly ${wanted} ${typeName} to hand over`,
        );
      }
      for (const itemId of picks) {
        if (seen.has(itemId)) {
          throw new BadRequestException(
            `The same ${typeName} was chosen for two lines`,
          );
        }
        seen.add(itemId);
        moves.push({
          itemId,
          itemTypeId: line.itemTypeId as string,
          typeName,
          sourceUserId: line.sourceUserId,
          destinationUserId: line.destinationUserId,
        });
      }
    }

    return moves;
  }

  /**
   * Move every row, and write the ledger rows for it.
   *
   * The update is conditional on the item still being owned by the side that
   * offered it, still being alive, and being of the type the line asked for --
   * that last one is what stops a selection handing over a different item than
   * the one requested. Checking and then writing would leave a window; making
   * the WHERE clause carry the check means a concurrent transfer loses the race
   * rather than being overwritten by it.
   */
  private async moveItems(
    tx: Prisma.TransactionClient,
    trade: TradeForResponse,
    moves: ResolvedMove[],
    batchId: string,
  ) {
    for (const move of moves) {
      const { count } = await tx.item.updateMany({
        where: {
          id: move.itemId,
          ownerId: move.sourceUserId,
          itemTypeId: move.itemTypeId,
          destroyedAt: null,
        },
        data: { ownerId: move.destinationUserId },
      });

      if (count !== 1) {
        throw new BadRequestException(
          `${move.typeName} is no longer available from the member offering it`,
        );
      }
    }

    if (moves.length === 0) return;

    // One ledger event per direction per type, because recordBatch carries a
    // single item type. They share the trade's batch id, so a settlement still
    // reads as one thing however many events it took to write.
    for (const [sourceUserId, sourceMoves] of groupBy(
      moves,
      (m) => m.sourceUserId,
    )) {
      for (const [itemTypeId, typeMoves] of groupBy(
        sourceMoves,
        (m) => m.itemTypeId,
      )) {
        await this.itemTransactions.recordBatch(
          {
            communityId: trade.communityId,
            itemTypeId,
            itemIds: typeMoves.map((m) => m.itemId),
            kind: ItemTransactionKind.TRANSFER,
            fromUserId: sourceUserId,
            toUserId: typeMoves[0].destinationUserId,
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
        items: {
          include: { item: { include: { itemType: true } }, itemType: true },
        },
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
        itemCount: input.offering.length + input.requesting.length,
        currencyCount: input.coin.length,
      },
    });
  }
}
