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
import { userMapperSelect } from "../users/utils/user-resolver-mappers";

/** How long an offer stands when the proposer does not say otherwise. */
const DEFAULT_EXPIRY_DAYS = 7;

/**
 * Everything a reader or settlement needs off a trade in one go.
 *
 * The people are included rather than left to field resolvers because every
 * surface that shows a trade shows who is on each end of every line, and
 * because a mapper that returns half-built User objects is the lie the social
 * module was full of.
 */
export const TRADE_INCLUDE = {
  community: true,
  proposer: { select: userMapperSelect },
  recipient: { select: userMapperSelect },
  items: {
    include: {
      item: { include: { itemType: true } },
      itemType: true,
      sourceUser: { select: userMapperSelect },
      destinationUser: { select: userMapperSelect },
    },
  },
  currencyLines: {
    include: {
      currency: true,
      sourceUser: { select: userMapperSelect },
      destinationUser: { select: userMapperSelect },
    },
  },
} satisfies Prisma.TradeInclude;

/** A trade loaded with everything settlement needs to check and move. */
type TradeForResponse = Prisma.TradeGetPayload<{
  include: {
    items: {
      include: {
        item: { include: { itemType: true } };
        itemType: true;
      };
    };
    // The code, so a shortfall can be reported in the unit the member sees
    // rather than as a bare number.
    currencyLines: { include: { currency: { select: { code: true } } } };
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
    const data = await this.draft(proposerId, input);

    const trade = await this.db.trade.create({
      data,
      include: { items: true, currencyLines: true },
    });

    await this.notifyRecipient(trade.id, proposerId, input);

    return trade;
  }

  /**
   * Answer an offer with a different one.
   *
   * The decline and the new offer are one step, so nothing is lost by opening
   * the composer and thinking better of it. Countering used to be two calls
   * from the client, which meant the decline landed the moment the button was
   * pressed: abandon the composer and the original was gone, with no way back
   * to what you had been offered.
   *
   * One notification, not two. The original proposer is the recipient of both,
   * and a counter arriving says everything a decline would have.
   */
  async counter(userId: string, tradeId: string, input: CreateTradeInput) {
    const original = await this.loadForResponse(tradeId);

    if (original.recipientId !== userId) {
      throw new ForbiddenException("Only the recipient can counter this trade");
    }
    if (effectiveStatus(original) === "EXPIRED") {
      throw new BadRequestException("That offer has expired");
    }
    if (
      input.communityId !== original.communityId ||
      input.recipientId !== original.proposerId
    ) {
      throw new BadRequestException(
        "A counter-offer goes back to the member who made the offer, in the same community",
      );
    }

    // Resolved before the transaction opens, because it is several reads and
    // holding a write transaction across them buys nothing -- everything it
    // checks is advisory and gets checked again at accept anyway.
    const data = await this.draft(userId, input);

    const trade = await this.db.$transaction(async (tx) => {
      // Conditional on PENDING, so a race with the proposer withdrawing loses
      // rather than declining a trade that is already closed.
      const { count } = await tx.trade.updateMany({
        where: { id: tradeId, status: TradeStatus.PENDING },
        data: { status: TradeStatus.DECLINED, respondedAt: new Date() },
      });
      if (count !== 1) {
        throw new BadRequestException("That trade is no longer open");
      }

      return tx.trade.create({
        data,
        include: { items: true, currencyLines: true },
      });
    });

    await this.notifyRecipient(trade.id, userId, input);

    return trade;
  }

  /**
   * Validate an offer and resolve it into the row a create would write.
   *
   * Shared by composing and countering, which differ only in what else happens
   * in the same breath.
   */
  private async draft(
    proposerId: string,
    input: CreateTradeInput,
  ): Promise<Prisma.TradeUncheckedCreateInput> {
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

    return {
      communityId: input.communityId,
      proposerId,
      recipientId: input.recipientId,
      note: input.note?.trim() || null,
      expiresAt,
      items: { create: lines },
      currencyLines: { create: coinLines },
    };
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

    const lines = [...net.entries()]
      // A currency that nets to zero is not on the table at all.
      .filter(([, delta]) => delta !== 0)
      .map(([currencyId, delta]) => ({
        currencyId,
        amount: Math.abs(delta),
        sourceUserId: delta > 0 ? proposerId : recipientId,
        destinationUserId: delta > 0 ? recipientId : proposerId,
      }));

    await this.assertCanCoverCoin(proposerId, lines);

    return lines;
  }

  /**
   * Stop the proposer promising coin they will not have.
   *
   * The counterpart to the double-promise check on items, and for the same
   * reason: nothing is escrowed, so three offers can each promise 300 of a 380
   * balance, and the first to settle leaves the rest to fail at accept in front
   * of someone with no way to see why. Availability is the balance minus what
   * is already committed in the proposer's other open offers.
   *
   * Only the proposer's side. What the recipient owes is left alone, exactly as
   * a by-type request against their holdings is: their balance is theirs to
   * change between now and answering, and refusing an ask they could easily
   * meet by then would be reserving someone else's property to no purpose.
   */
  private async assertCanCoverCoin(
    proposerId: string,
    lines: { currencyId: string; amount: number; sourceUserId: string }[],
  ) {
    for (const line of lines) {
      if (line.sourceUserId !== proposerId) continue;

      const [held, committed] = await Promise.all([
        this.db.currencyBalance.findUnique({
          where: {
            currencyId_userId: {
              currencyId: line.currencyId,
              userId: proposerId,
            },
          },
          select: { amount: true, currency: { select: { code: true } } },
        }),
        this.db.tradeCurrencyLine.aggregate({
          where: {
            currencyId: line.currencyId,
            sourceUserId: proposerId,
            trade: {
              status: TradeStatus.PENDING,
              expiresAt: { gt: new Date() },
              proposerId,
            },
          },
          _sum: { amount: true },
        }),
      ]);

      const balance = held?.amount ?? 0;
      const promised = committed._sum.amount ?? 0;
      if (balance - promised >= line.amount) continue;

      // Naming the commitment matters: "you do not have 300" is baffling to
      // someone looking at a balance of 380, and sends them to the wallet
      // rather than to the offers they have forgotten about.
      const code = held?.currency.code ?? "";
      throw new BadRequestException(
        promised > 0
          ? `That offer needs ${line.amount} ${code}, but ${promised} of your ${balance} is already promised in other open offers`
          : `You do not have ${line.amount} ${code}`,
      );
    }
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

      const resolved = await this.resolveSelections(tx, trade, selections);
      await this.assertStillTradeable(tx, resolved);
      await this.moveItems(tx, trade, resolved, batchId);
      await this.moveCoin(tx, trade, batchId);

      const settled = await tx.trade.update({
        where: { id: tradeId },
        data: {
          status: TradeStatus.ACCEPTED,
          respondedAt: new Date(),
          settlementBatchId: batchId,
        },
        include: { items: true, currencyLines: true },
      });

      // Inside the transaction: a settlement that rolls back must not leave the
      // proposer told their trade went through.
      await this.notifications.create(
        {
          recipientId: trade.proposerId,
          kind: NotificationKind.TRADE_ACCEPTED,
          actorUserId: trade.recipientId,
          communityId: trade.communityId,
          subjectType: NotificationSubjectType.TRADE,
          subjectId: trade.id,
          data: {
            itemCount: resolved.length,
            currencyCount: trade.currencyLines.length,
          },
        },
        tx,
      );

      return settled;
    });
  }

  /**
   * Turn every line into the concrete rows that will move.
   *
   * A by-row line already is one. A by-type line is satisfied either by rows
   * the recipient picked or, when they did not pick, by whichever rows the
   * database hands back -- newest first.
   *
   * Choosing is an override, not a step. The whole point of a by-type line is
   * that any rows will do, so demanding a choice would put a decision in front
   * of someone who by definition does not have one to make. Someone who does
   * care -- an old copy with a history they want to keep -- can say so.
   *
   * Runs inside the settlement transaction so the default sees ownership as it
   * is at settlement, not as it was when the accept screen loaded.
   */
  private async resolveSelections(
    tx: Prisma.TransactionClient,
    trade: TradeForResponse,
    selections: TradeSelection[],
  ): Promise<ResolvedMove[]> {
    const chosen = new Map(selections.map((s) => [s.tradeItemId, s.itemIds]));
    const moves: ResolvedMove[] = [];
    const claimed = new Set<string>();

    for (const line of trade.items) {
      if (line.itemId) {
        claimed.add(line.itemId);
        moves.push({
          itemId: line.itemId,
          itemTypeId: line.item?.itemTypeId as string,
          typeName: line.item?.itemType.name ?? "That item",
          sourceUserId: line.sourceUserId,
          destinationUserId: line.destinationUserId,
        });
        continue;
      }

      const wanted = line.quantity as number;
      const typeName = line.itemType?.name ?? "that item";
      const picks = chosen.get(line.id);

      const itemIds = picks
        ? this.verifyPicks(picks, wanted, typeName, claimed)
        : await this.pickDefault(tx, line, wanted, typeName, claimed);

      for (const itemId of itemIds) {
        claimed.add(itemId);
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
   * Re-check tradeability against the types actually about to move.
   *
   * Compose time already refused an untradeable type, but nothing is held while
   * an offer stands and staff can lock a type in between -- which is usually
   * exactly when they would, because something has gone wrong with it. Without
   * this the offer settles anyway and the community's decision is bypassed by
   * whichever trades happened to be open when it was made.
   *
   * Inside the settlement transaction, on the resolved moves rather than the
   * lines, so a by-type line is judged on the rows it actually resolved to.
   */
  private async assertStillTradeable(
    tx: Prisma.TransactionClient,
    moves: ResolvedMove[],
  ) {
    if (moves.length === 0) return;

    const locked = await tx.itemType.findMany({
      where: {
        id: { in: [...new Set(moves.map((m) => m.itemTypeId))] },
        isTradeable: false,
      },
      select: { name: true },
    });

    if (locked.length) {
      throw new BadRequestException(
        `${locked[0].name} can no longer be traded`,
      );
    }
  }

  /**
   * Check what the recipient picked.
   *
   * A selection is a claim about someone's own property, so the count and the
   * absence of duplicates are verified here; ownership and type are verified by
   * the conditional update that actually moves the row.
   */
  private verifyPicks(
    picks: string[],
    wanted: number,
    typeName: string,
    claimed: Set<string>,
  ): string[] {
    if (picks.length !== wanted) {
      throw new BadRequestException(
        `Choose exactly ${wanted} ${typeName} to hand over`,
      );
    }
    if (new Set(picks).size !== picks.length) {
      throw new BadRequestException(`The same ${typeName} was chosen twice`);
    }
    for (const id of picks) {
      if (claimed.has(id)) {
        throw new BadRequestException(
          `The same ${typeName} is already on the table`,
        );
      }
    }
    return picks;
  }

  /**
   * Pick rows when the recipient did not.
   *
   * Newest first, and the choice is genuinely arbitrary: rows of a type differ
   * only by history, so this hands over the copies with the least of it. Rows
   * already claimed by another line of the same trade are excluded, which is
   * what stops a by-row request and a by-type request colliding on one item.
   */
  private async pickDefault(
    tx: Prisma.TransactionClient,
    line: TradeForResponse["items"][number],
    wanted: number,
    typeName: string,
    claimed: Set<string>,
  ): Promise<string[]> {
    const rows = await tx.item.findMany({
      where: {
        itemTypeId: line.itemTypeId as string,
        ownerId: line.sourceUserId,
        destroyedAt: null,
        id: { notIn: [...claimed] },
      },
      orderBy: { createdAt: "desc" },
      take: wanted,
      select: { id: true },
    });

    if (rows.length < wanted) {
      throw new BadRequestException(
        `That member no longer holds ${wanted} ${typeName}`,
      );
    }
    return rows.map((r) => r.id);
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

  /**
   * Move every coin line, on the same transaction and the same batch id.
   *
   * The shortfall is checked here rather than left to the ledger, because the
   * ledger phrases it as "You do not have 120 HC to send" -- addressed to the
   * caller, who in a trade is whoever clicked accept. When the proposer is the
   * one who came up short, that told the recipient they were broke while they
   * sat on plenty. The balance floor is still a database constraint and still
   * the authority; this only decides what the member reads.
   */
  private async moveCoin(
    tx: Prisma.TransactionClient,
    trade: TradeForResponse,
    batchId: string,
  ) {
    for (const line of trade.currencyLines) {
      const held = await tx.currencyBalance.findUnique({
        where: {
          currencyId_userId: {
            currencyId: line.currencyId,
            userId: line.sourceUserId,
          },
        },
        select: { amount: true },
      });

      if ((held?.amount ?? 0) < line.amount) {
        const short = `${line.amount} ${line.currency.code}`;
        throw new BadRequestException(
          line.sourceUserId === trade.recipientId
            ? `You do not have ${short} to complete this trade`
            : `The member who made this offer no longer has ${short}`,
        );
      }

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

  /**
   * The recipient says no. Nothing was held, so nothing is released.
   *
   * The proposer is told, because they are waiting on an answer. Countering
   * closes a trade the same way but in one step with the replacement, so it
   * does not come through here -- see {@link counter}.
   */
  async decline(tradeId: string, userId: string) {
    const trade = await this.loadForResponse(tradeId);
    if (trade.recipientId !== userId) {
      throw new ForbiddenException("Only the recipient can decline this trade");
    }

    const closed = await this.close(tradeId, TradeStatus.DECLINED);

    await this.notifications.create({
      recipientId: trade.proposerId,
      kind: NotificationKind.TRADE_DECLINED,
      actorUserId: trade.recipientId,
      communityId: trade.communityId,
      subjectType: NotificationSubjectType.TRADE,
      subjectId: trade.id,
      data: {},
    });

    return closed;
  }

  /**
   * The proposer withdraws it.
   *
   * No notification: the recipient was told when it arrived, and telling them
   * it is gone would be a second interruption about a thing that now needs
   * nothing from them. It simply leaves their inbox.
   */
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
   * One member's trades, newest first.
   *
   * Both inboxes in one query: offers waiting on you and offers you have out.
   * `EXPIRED` is not a stored status, so filtering by it means asking for
   * PENDING rows whose date has passed.
   */
  async findForMember(
    userId: string,
    filters: {
      communityId?: string;
      status?: EffectiveTradeStatus;
      first?: number;
      after?: string;
    },
  ) {
    const take = Math.min(filters.first ?? 20, 100);
    const now = new Date();

    const statusWhere: Prisma.TradeWhereInput =
      filters.status === "EXPIRED"
        ? { status: TradeStatus.PENDING, expiresAt: { lte: now } }
        : filters.status === TradeStatus.PENDING
          ? { status: TradeStatus.PENDING, expiresAt: { gt: now } }
          : filters.status
            ? { status: filters.status }
            : {};

    const where: Prisma.TradeWhereInput = {
      OR: [{ proposerId: userId }, { recipientId: userId }],
      ...(filters.communityId ? { communityId: filters.communityId } : {}),
      ...statusWhere,
    };

    const [rows, totalCount] = await Promise.all([
      this.db.trade.findMany({
        where,
        include: TRADE_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: take + 1,
        ...(filters.after ? { skip: 1, cursor: { id: filters.after } } : {}),
      }),
      this.db.trade.count({ where }),
    ]);

    return {
      nodes: rows.slice(0, take),
      totalCount,
      hasNextPage: rows.length > take,
      hasPreviousPage: Boolean(filters.after),
    };
  }

  /**
   * One trade, readable by either party.
   *
   * Deliberately not public. An offer is a private conversation between two
   * members until it settles -- the ledger is where a settled one becomes
   * everybody's business.
   */
  async findOne(tradeId: string, userId: string) {
    const trade = await this.db.trade.findUnique({
      where: { id: tradeId },
      include: TRADE_INCLUDE,
    });
    if (!trade) throw new NotFoundException("Trade not found");
    if (trade.proposerId !== userId && trade.recipientId !== userId) {
      throw new ForbiddenException("That trade is not yours");
    }
    return trade;
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
        currencyLines: { include: { currency: { select: { code: true } } } },
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
