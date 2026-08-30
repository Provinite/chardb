import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  Prisma,
  CurrencyTransactionSource,
  ItemTransactionKind,
  ItemTransactionSource,
} from "@chardb/database";
import { DatabaseService } from "../database/database.service";
import { CurrencyLedgerService } from "../currencies/currency-ledger.service";
import { ItemsService } from "../items/items.service";

/**
 * How long a buyer may undo their own purchase.
 *
 * Short on purpose. This is an undo button for the wrong click, not a returns
 * policy -- anything past it is a staff decision, because by then the item has
 * had time to be traded, used, or shown to somebody.
 */
export const REFUND_WINDOW_MS = 15 * 60 * 1000;

/** One line of a checkout: what to buy, at which price, how many. */
export interface CheckoutLineInput {
  shopItemId: string;
  shopPriceId: string;
  quantity: number;
}

@Injectable()
export class ShopService {
  constructor(
    private readonly db: DatabaseService,
    private readonly ledger: CurrencyLedgerService,
    private readonly items: ItemsService,
  ) {}

  // ==================== Reads ====================

  /**
   * What a community sells.
   *
   * Inactive listings are hidden from members but kept for staff, because a
   * listing that has sold things is the only record of what those things cost.
   */
  async findShopItems(communityId: string, includeInactive = false) {
    return this.db.shopItem.findMany({
      where: { communityId, ...(includeInactive ? {} : { active: true }) },
      include: {
        itemType: true,
        prices: {
          orderBy: { sortOrder: "asc" },
          include: { components: { include: { currency: true } } },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async findShopItemOrThrow(id: string) {
    const item = await this.db.shopItem.findUnique({
      where: { id },
      include: {
        itemType: true,
        prices: {
          orderBy: { sortOrder: "asc" },
          include: { components: { include: { currency: true } } },
        },
      },
    });
    if (!item) throw new NotFoundException(`Shop item ${id} not found`);
    return item;
  }

  /**
   * How many of a listing somebody already holds against its per-user cap.
   *
   * Refunded lines do not count. A cap is on what you have, not on how many
   * times you have clicked buy -- otherwise undoing a mistake would spend the
   * allowance it was meant to return.
   */
  async countPurchased(
    client: Prisma.TransactionClient | DatabaseService,
    shopItemId: string,
    userId: string,
  ): Promise<number> {
    return client.shopPurchaseLine.count({
      where: {
        shopItemId,
        refundedAt: null,
        purchase: { buyerId: userId },
      },
    });
  }

  async findPurchases(communityId: string, buyerId: string) {
    return this.db.shopPurchase.findMany({
      where: { communityId, buyerId },
      include: {
        lines: {
          include: {
            shopItem: { include: { itemType: true } },
            costs: { include: { currency: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // ==================== Admin ====================

  async createShopItem(input: {
    communityId: string;
    itemTypeId: string;
    name?: string | null;
    description?: string | null;
    stock?: number | null;
    maxPerUser?: number | null;
    sortOrder?: number | null;
    prices: Array<{
      components: Array<{ currencyId: string; amount: number }>;
    }>;
  }) {
    await this.assertPricesBelongTo(input.communityId, input.prices);

    const itemType = await this.db.itemType.findUnique({
      where: { id: input.itemTypeId },
      select: { communityId: true },
    });
    if (!itemType || itemType.communityId !== input.communityId) {
      throw new BadRequestException(
        "That item type does not belong to this community",
      );
    }

    return this.db.shopItem.create({
      data: {
        communityId: input.communityId,
        itemTypeId: input.itemTypeId,
        name: input.name?.trim() || null,
        description: input.description?.trim() || null,
        stock: input.stock ?? null,
        maxPerUser: input.maxPerUser ?? null,
        sortOrder: input.sortOrder ?? 0,
        prices: {
          create: input.prices.map((price, index) => ({
            sortOrder: index,
            components: { create: price.components },
          })),
        },
      },
      include: {
        itemType: true,
        prices: {
          orderBy: { sortOrder: "asc" },
          include: { components: { include: { currency: true } } },
        },
      },
    });
  }

  async updateShopItem(
    id: string,
    input: {
      name?: string | null;
      description?: string | null;
      stock?: number | null;
      maxPerUser?: number | null;
      sortOrder?: number | null;
      active?: boolean | null;
      prices?: Array<{
        components: Array<{ currencyId: string; amount: number }>;
      }> | null;
    },
  ) {
    const existing = await this.db.shopItem.findUnique({
      where: { id },
      select: { communityId: true },
    });
    if (!existing) throw new NotFoundException(`Shop item ${id} not found`);

    if (input.prices) {
      await this.assertPricesBelongTo(existing.communityId, input.prices);
    }

    return this.db.$transaction(async (tx) => {
      const data: Prisma.ShopItemUpdateInput = {};
      if (input.name !== undefined) data.name = input.name?.trim() || null;
      if (input.description !== undefined) {
        data.description = input.description?.trim() || null;
      }
      if (input.stock !== undefined) data.stock = input.stock;
      if (input.maxPerUser !== undefined) data.maxPerUser = input.maxPerUser;
      if (input.sortOrder !== undefined && input.sortOrder !== null) {
        data.sortOrder = input.sortOrder;
      }
      if (input.active !== undefined && input.active !== null) {
        data.active = input.active;
      }

      await tx.shopItem.update({ where: { id }, data });

      if (input.prices) {
        // Replaced wholesale rather than diffed. Past purchases are unaffected
        // -- what they paid is copied onto the line, and a line's price
        // reference is nulled rather than cascading.
        await tx.shopPrice.deleteMany({ where: { shopItemId: id } });
        for (const [index, price] of input.prices.entries()) {
          await tx.shopPrice.create({
            data: {
              shopItemId: id,
              sortOrder: index,
              components: { create: price.components },
            },
          });
        }
      }

      return tx.shopItem.findUniqueOrThrow({
        where: { id },
        include: {
          itemType: true,
          prices: {
            orderBy: { sortOrder: "asc" },
            include: { components: { include: { currency: true } } },
          },
        },
      });
    });
  }

  /**
   * Every currency named by a price must belong to the same community, and be
   * spendable.
   *
   * Without the first check a listing could be priced in another community's
   * coin -- the same shape of hole as awarding across communities. Without the
   * second, an option could name a currency nobody can be charged in, and the
   * listing would look buyable while never being so.
   */
  private async assertPricesBelongTo(
    communityId: string,
    prices: Array<{ components: Array<{ currencyId: string }> }>,
  ) {
    const ids = [
      ...new Set(prices.flatMap((p) => p.components.map((c) => c.currencyId))),
    ];
    if (ids.length === 0) return;

    const currencies = await this.db.currency.findMany({
      where: { id: { in: ids } },
      select: { id: true, communityId: true, archivedAt: true, name: true },
    });

    for (const id of ids) {
      const currency = currencies.find((c) => c.id === id);
      if (!currency || currency.communityId !== communityId) {
        throw new BadRequestException(
          "A price names a currency from another community",
        );
      }
      if (currency.archivedAt) {
        throw new BadRequestException(
          `${currency.name} is archived and cannot be charged`,
        );
      }
    }
  }

  // ==================== Viewer-aware reads ====================

  /**
   * The shop as one member sees it: what it costs, what they can afford, and
   * how much of their allowance is spent.
   *
   * Affordability is advisory. It is computed from balances read a moment ago,
   * and checkout is what actually decides -- a page that says "you can afford
   * this" and a purchase that says otherwise is a race, not a lie.
   */
  async findShopForViewer(
    communityId: string,
    viewerId: string,
    includeInactive = false,
  ) {
    const items = await this.findShopItems(communityId, includeInactive);
    if (items.length === 0) return [];

    const [balances, counts] = await Promise.all([
      this.db.currencyBalance.findMany({
        where: { userId: viewerId, currency: { communityId } },
        select: { currencyId: true, amount: true },
      }),
      this.db.shopPurchaseLine.groupBy({
        by: ["shopItemId"],
        where: {
          refundedAt: null,
          purchase: { buyerId: viewerId, communityId },
        },
        _count: { _all: true },
      }),
    ]);

    const held = new Map(balances.map((b) => [b.currencyId, b.amount]));
    const bought = new Map(counts.map((c) => [c.shopItemId, c._count._all]));

    return items.map((item) => ({
      ...item,
      purchasedByViewer: bought.get(item.id) ?? 0,
      prices: item.prices.map((price) => ({
        ...price,
        affordable: price.components.every(
          (component) =>
            (held.get(component.currencyId) ?? 0) >= component.amount,
        ),
      })),
    }));
  }

  /**
   * A member's purchases, each line saying whether it can still be undone.
   *
   * The reason is returned alongside the flag because "you cannot undo this"
   * with no explanation is the kind of thing that becomes a support message.
   */
  async findPurchasesForViewer(communityId: string, viewerId: string) {
    const purchases = await this.findPurchases(communityId, viewerId);
    const lineIds = purchases.flatMap((p) => p.lines.map((l) => l.id));
    if (lineIds.length === 0) return [];

    // One query for every line's granted item, rather than one per line.
    const grants = await this.db.itemTransaction.findMany({
      where: {
        source: ItemTransactionSource.SHOP_PURCHASE,
        sourceId: { in: lineIds },
        kind: ItemTransactionKind.GRANT,
      },
      select: { sourceId: true, itemId: true },
    });
    const itemByLine = new Map(grants.map((g) => [g.sourceId, g.itemId]));

    const items = await this.db.item.findMany({
      where: { id: { in: grants.map((g) => g.itemId) } },
      select: { id: true, ownerId: true, destroyedAt: true },
    });
    const itemById = new Map(items.map((i) => [i.id, i]));

    const now = Date.now();

    return purchases.map((purchase) => ({
      ...purchase,
      lines: purchase.lines.map((line) => {
        const blocked = refundBlockedReason(
          { ...line, buyerId: purchase.buyerId },
          itemById.get(itemByLine.get(line.id) ?? ""),
          now,
          viewerId,
        );
        return {
          ...line,
          refundableByViewer: blocked === null,
          refundBlockedReason: blocked,
        };
      }),
    }));
  }

  // ==================== Checkout ====================

  /**
   * Buy a cart.
   *
   * Everything commits together: stock down, purchase and lines written, coin
   * spent, items granted. A checkout that took the money and granted nothing,
   * or granted without charging, is worse than one that fails and is retried.
   *
   * Prices are re-read from the database rather than trusted from the request.
   * The client sends which option it picked, never what that option costs --
   * otherwise the price is whatever the buyer says it is.
   */
  async checkout(
    communityId: string,
    buyerId: string,
    lines: CheckoutLineInput[],
  ) {
    if (lines.length === 0) {
      throw new BadRequestException("Nothing in the cart");
    }
    if (lines.some((l) => l.quantity < 1)) {
      throw new BadRequestException("Quantity must be at least one");
    }

    const purchaseId = randomUUID();

    return this.db.$transaction(async (tx) => {
      await tx.shopPurchase.create({
        data: { id: purchaseId, communityId, buyerId },
      });

      // Accumulated across the whole cart so the spend is one event with one
      // batch id, rather than a separate debit per line.
      const owed = new Map<string, number>();
      const grants: Array<{
        lineId: string;
        itemTypeId: string;
        communityId: string;
      }> = [];

      for (const input of lines) {
        const shopItem = await tx.shopItem.findUnique({
          where: { id: input.shopItemId },
          include: {
            itemType: { select: { id: true, communityId: true } },
            prices: { include: { components: true } },
          },
        });

        if (!shopItem || shopItem.communityId !== communityId) {
          throw new NotFoundException("That listing is not in this shop");
        }
        if (!shopItem.active) {
          throw new BadRequestException(`${shopItem.name} is not for sale`);
        }

        const price = shopItem.prices.find((p) => p.id === input.shopPriceId);
        if (!price) {
          throw new BadRequestException(
            "That price is not one of this listing's options",
          );
        }
        if (price.components.length === 0) {
          throw new BadRequestException("That price asks for nothing");
        }

        // Decrement first, and let the CHECK constraint arbitrate. Reading
        // the stock and comparing would let two concurrent checkouts both see
        // the last unit and both take it.
        if (shopItem.stock !== null) {
          try {
            await tx.shopItem.update({
              where: { id: shopItem.id },
              data: { stock: { decrement: input.quantity } },
            });
          } catch (error) {
            if (isStockExhausted(error)) {
              throw new ConflictException(
                `There are not that many ${shopItem.name ?? "items"} left`,
              );
            }
            throw error;
          }
        }

        if (shopItem.maxPerUser !== null) {
          // A per-user cap has no constraint to arbitrate it the way stock
          // does, so the count has to be taken under a lock or two concurrent
          // checkouts both see the same "already" and both buy the cap.
          //
          // Decrementing stock above already takes this row's lock; a listing
          // with unlimited stock takes none, so a write that changes nothing
          // stands in for one. Checkouts of the same listing then serialise,
          // and the second one's count sees the first one's committed lines.
          if (shopItem.stock === null) {
            await tx.shopItem.update({
              where: { id: shopItem.id },
              data: { updatedAt: new Date() },
            });
          }

          const already = await this.countPurchased(tx, shopItem.id, buyerId);
          if (already + input.quantity > shopItem.maxPerUser) {
            throw new ConflictException(
              `You may only have ${shopItem.maxPerUser} of that`,
            );
          }
        }

        // One row per unit. Buying three is three lines, each refundable on
        // its own, each naming the one item it granted.
        for (let i = 0; i < input.quantity; i++) {
          const line = await tx.shopPurchaseLine.create({
            data: {
              purchaseId,
              shopItemId: shopItem.id,
              shopPriceId: price.id,
              // Copied, not referenced: options get edited, and a refund has
              // to return what was paid rather than what it costs now.
              costs: {
                create: price.components.map((c) => ({
                  currencyId: c.currencyId,
                  amount: c.amount,
                })),
              },
            },
          });

          for (const component of price.components) {
            owed.set(
              component.currencyId,
              (owed.get(component.currencyId) ?? 0) + component.amount,
            );
          }

          grants.push({
            lineId: line.id,
            itemTypeId: shopItem.itemType.id,
            communityId: shopItem.itemType.communityId,
          });
        }
      }

      // Charge once for the whole cart. Throws if they cannot cover it, which
      // rolls back the stock decrements above along with everything else.
      await this.ledger.debit({
        userId: buyerId,
        amounts: [...owed].map(([currencyId, amount]) => ({
          currencyId,
          amount,
        })),
        reason: "Shop purchase",
        source: CurrencyTransactionSource.SHOP_PURCHASE,
        sourceId: purchaseId,
        tx,
      });

      // Granted per line rather than per listing, so each item's ledger row
      // names the exact line that bought it and a refund knows what to take
      // back.
      for (const grant of grants) {
        await this.items.createGranted(tx, {
          itemTypeId: grant.itemTypeId,
          communityId: grant.communityId,
          ownerId: buyerId,
          quantity: 1,
          actor: { actorUserId: buyerId, reason: "Bought from the shop" },
          source: ItemTransactionSource.SHOP_PURCHASE,
          sourceId: grant.lineId,
        });
      }

      return tx.shopPurchase.findUniqueOrThrow({
        where: { id: purchaseId },
        include: {
          lines: {
            include: {
              shopItem: { include: { itemType: true } },
              costs: { include: { currency: true } },
            },
          },
        },
      });
    });
  }

  // ==================== Refunds ====================

  /**
   * Undo one unit of a purchase.
   *
   * The buyer may do this themselves inside the window; staff may do it at any
   * time. Either way it is not a reversal -- nothing is rewritten. The item is
   * revoked, the stock goes back, and the coin returns as new ledger rows
   * pointing at the same line, so the history reads as two things that
   * happened rather than one that was edited away.
   */
  async refundLine(lineId: string, actorId: string, isStaff: boolean) {
    const line = await this.db.shopPurchaseLine.findUnique({
      where: { id: lineId },
      include: {
        purchase: true,
        costs: true,
        shopItem: { select: { id: true, stock: true, name: true } },
      },
    });
    if (!line) throw new NotFoundException("No such purchase line");

    if (line.refundedAt) {
      throw new ConflictException("That has already been refunded");
    }

    const isBuyer = line.purchase.buyerId === actorId;
    if (!isBuyer && !isStaff) {
      throw new ForbiddenException("That is not your purchase");
    }
    if (isBuyer && !isStaff) {
      const age = Date.now() - line.createdAt.getTime();
      if (age > REFUND_WINDOW_MS) {
        throw new ForbiddenException(
          "The undo window has passed -- ask a moderator",
        );
      }
    }

    // The single item this line granted, found through the ledger rather than
    // stored twice on the line.
    const grant = await this.db.itemTransaction.findFirst({
      where: {
        source: ItemTransactionSource.SHOP_PURCHASE,
        sourceId: lineId,
        kind: ItemTransactionKind.GRANT,
      },
      select: { itemId: true },
    });
    if (!grant) {
      throw new ConflictException("That purchase has no item to give back");
    }

    const item = await this.db.item.findUnique({
      where: { id: grant.itemId },
      select: { ownerId: true, destroyedAt: true },
    });
    if (!item || item.destroyedAt) {
      throw new ConflictException(
        "That item no longer exists, so it cannot be given back",
      );
    }
    if (item.ownerId !== line.purchase.buyerId) {
      throw new ConflictException(
        "That item has changed hands, so it cannot be given back",
      );
    }

    return this.db.$transaction(async (tx) => {
      // Claim the line first. Two refunds racing on the same line both pass
      // the checks above; only one can move it out of the unrefunded state,
      // and the loser updates nothing.
      const claimed = await tx.shopPurchaseLine.updateMany({
        where: { id: lineId, refundedAt: null },
        data: { refundedAt: new Date(), refundedById: actorId },
      });
      if (claimed.count === 0) {
        throw new ConflictException("That has already been refunded");
      }

      await this.items.destroyItems(
        tx,
        [grant.itemId],
        { actorUserId: actorId, reason: "Shop purchase refunded" },
        ItemTransactionSource.SHOP_PURCHASE,
        lineId,
      );

      // Only when the listing tracks stock at all. Incrementing a null would
      // invent a limit the shop never had.
      if (line.shopItem.stock !== null) {
        await tx.shopItem.update({
          where: { id: line.shopItem.id },
          data: { stock: { increment: 1 } },
        });
      }

      // Every currency the line actually cost, at the amount that was
      // actually paid, all under one batch id -- a refund returning Clover
      // and Star is one refund, not two.
      const refundBatchId = randomUUID();
      for (const cost of line.costs) {
        await this.ledger.credit({
          currencyId: cost.currencyId,
          awards: [{ userId: line.purchase.buyerId, amount: cost.amount }],
          reason: "Shop purchase refunded",
          actorUserId: actorId,
          source: CurrencyTransactionSource.SHOP_PURCHASE,
          sourceId: lineId,
          batchId: refundBatchId,
          tx,
          // The buyer may have left the community since. Refusing the whole
          // refund over that would strand both the item and the coin.
          skipNonMembers: true,
        });
      }

      return tx.shopPurchaseLine.findUniqueOrThrow({
        where: { id: lineId },
        include: { costs: { include: { currency: true } }, purchase: true },
      });
    });
  }
}

/** Postgres refuses the decrement when the last unit is already gone. */
function isStockExhausted(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes("shop_items_stock_non_negative");
}

/**
 * Why a buyer cannot undo a line, or null when they can.
 *
 * Staff are not covered here: they may refund at any time, and the reasons
 * below are the ones a buyer sees.
 */
function refundBlockedReason(
  line: { refundedAt: Date | null; createdAt: Date; buyerId: string },
  item: { ownerId: string | null; destroyedAt: Date | null } | undefined,
  now: number,
  viewerId: string,
): string | null {
  if (line.buyerId !== viewerId) return "This is not your purchase";
  if (line.refundedAt) return "Already refunded";
  if (now - line.createdAt.getTime() > REFUND_WINDOW_MS) {
    return "The undo window has passed -- ask a moderator";
  }
  if (!item) return "Nothing to give back";
  if (item.destroyedAt) return "That item has been used or destroyed";
  if (item.ownerId !== viewerId) return "That item has changed hands";
  return null;
}
