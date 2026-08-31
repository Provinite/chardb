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
import { MAX_UNITS_PER_ITEM } from "./dto/shop.dto";
import { ShopPurchaseLineStatus } from "./entities/shop.entity";
import {
  mapPrismaUserToGraphQL,
  userMapperSelect,
} from "../users/utils/user-resolver-mappers";

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

/**
 * Everything a listing needs before a viewer can be told about it.
 *
 * One definition because every path that returns a `ShopItem` has to satisfy
 * the same GraphQL shape, and the fields that are computed per viewer --
 * `affordable`, `purchasedByViewer` -- are non-nullable. A path that loads
 * less than this cannot be decorated, and a mutation that returns an
 * undecorated row fails at serialisation time, after its write has committed.
 */
const SHOP_ITEM_INCLUDE = {
  itemType: true,
  prices: {
    orderBy: { sortOrder: "asc" },
    include: { components: { include: { currency: true } } },
  },
} satisfies Prisma.ShopItemInclude;

type PricedShopItem = Prisma.ShopItemGetPayload<{
  include: typeof SHOP_ITEM_INCLUDE;
}>;

/**
 * A purchase line carries the whole listing, because a line is shown next to
 * what it bought. That makes the listing's viewer-computed fields this shape's
 * problem too, so it loads enough to decorate them.
 */
const PURCHASE_LINE_INCLUDE = {
  shopItem: { include: SHOP_ITEM_INCLUDE },
  costs: { include: { currency: true } },
  // `refundedBy` is on the entity and was resolving to null on every refunded
  // line for want of this. A staff view of a refund whose whole point is
  // accountability should say who did it.
  //
  // Selected rather than included whole: `userMapperSelect` exists so a join
  // for a username does not drag every password hash in the result set into
  // memory.
  refundedBy: { select: userMapperSelect },
} satisfies Prisma.ShopPurchaseLineInclude;

/** A purchase and everything shown beside it. */
const PURCHASE_INCLUDE = {
  buyer: { select: userMapperSelect },
  lines: {
    include: PURCHASE_LINE_INCLUDE,
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.ShopPurchaseInclude;

type PurchaseWithLines = Prisma.ShopPurchaseGetPayload<{
  include: typeof PURCHASE_INCLUDE;
}>;

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
      include: SHOP_ITEM_INCLUDE,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async findShopItemOrThrow(id: string) {
    const item = await this.db.shopItem.findUnique({
      where: { id },
      include: SHOP_ITEM_INCLUDE,
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
      include: PURCHASE_INCLUDE,
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
      include: SHOP_ITEM_INCLUDE,
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
    return this.decorateItems(communityId, viewerId, items);
  }

  /**
   * One listing, as its viewer sees it.
   *
   * Used by the admin mutations: what they return has to satisfy the same
   * non-nullable fields the storefront query does, and the cheapest way to be
   * sure of that is to answer with the same shape from the same code.
   */
  async findShopItemForViewer(id: string, viewerId: string) {
    const item = await this.findShopItemOrThrow(id);
    const [decorated] = await this.decorateItems(item.communityId, viewerId, [
      item,
    ]);
    return decorated;
  }

  /**
   * Attach the per-viewer fields to a set of listings.
   *
   * Two queries regardless of how many listings, because the alternative --
   * resolving `affordable` per price and `purchasedByViewer` per item -- is a
   * query per row on a page that exists to show many rows.
   */
  private async decorateItems(
    communityId: string,
    viewerId: string,
    items: PricedShopItem[],
  ) {
    if (items.length === 0) return [];

    const [balances, counts] = await Promise.all([
      this.db.currencyBalance.findMany({
        where: { userId: viewerId, currency: { communityId } },
        select: { currencyId: true, amount: true },
      }),
      this.db.shopPurchaseLine.groupBy({
        by: ["shopItemId"],
        where: {
          shopItemId: { in: items.map((item) => item.id) },
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
    return this.decoratePurchases(
      communityId,
      viewerId,
      await this.findPurchases(communityId, viewerId),
    );
  }

  /**
   * The viewer's own purchase lines: searchable, filterable, paged.
   *
   * Lines rather than purchases because a line is the unit a buyer counts and
   * acts on. "I bought ten items, then ten more" is twenty lines across two
   * checkouts, and a filter for "refunded" or a search for an item name means
   * nothing at the level of a basket that may hold both.
   *
   * Paged on the server, so a member with a long history is not sent all of it
   * to have most of it thrown away -- which is exactly how the eight-line
   * sidebar panel came to hide everything behind it (#289).
   */
  async findPurchaseLinesForViewer(
    viewerId: string,
    filters: {
      communityId: string;
      search?: string | null;
      status?: ShopPurchaseLineStatus | null;
      limit?: number;
      offset?: number;
    },
  ) {
    const take = Math.min(Math.max(filters.limit ?? 25, 1), 100);
    const skip = Math.max(filters.offset ?? 0, 0);
    const search = filters.search?.trim();

    const where: Prisma.ShopPurchaseLineWhereInput = {
      purchase: { communityId: filters.communityId, buyerId: viewerId },
      ...(filters.status === ShopPurchaseLineStatus.REFUNDED
        ? { refundedAt: { not: null } }
        : filters.status === ShopPurchaseLineStatus.ACTIVE
          ? { refundedAt: null }
          : {}),
      // A listing's name is optional and falls back to its item type's, so a
      // search that only looked at one of them would miss whichever the buyer
      // actually saw on the card.
      ...(search
        ? {
            shopItem: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                {
                  itemType: {
                    name: { contains: search, mode: "insensitive" },
                  },
                },
              ],
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.db.shopPurchaseLine.findMany({
        where,
        include: {
          ...PURCHASE_LINE_INCLUDE,
          purchase: { select: { buyerId: true, createdAt: true } },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      this.db.shopPurchaseLine.count({ where }),
    ]);

    const lines = await this.decorateLines(
      filters.communityId,
      viewerId,
      rows.map((row) => ({
        ...row,
        buyerId: row.purchase.buyerId,
        purchasedAt: row.purchase.createdAt,
      })),
    );

    return { lines, total, hasMore: skip + rows.length < total };
  }

  /**
   * A community's purchases, for staff.
   *
   * The buyer's own list is the same data seen from inside; this is the view
   * that makes "ask a moderator" a thing a moderator can act on. Newest first
   * and capped, because the useful question is nearly always about something
   * that just happened.
   */
  async findPurchasesForCommunity(
    communityId: string,
    viewerId: string,
    options: { buyerId?: string | null; limit?: number } = {},
  ) {
    const take = Math.min(Math.max(options.limit ?? 50, 1), 100);

    const purchases = await this.db.shopPurchase.findMany({
      where: {
        communityId,
        ...(options.buyerId ? { buyerId: options.buyerId } : {}),
      },
      include: PURCHASE_INCLUDE,
      orderBy: { createdAt: "desc" },
      take,
    });

    return this.decoratePurchases(communityId, viewerId, purchases, true);
  }

  /**
   * Attach the per-viewer fields to a set of purchases.
   *
   * Shared with checkout so that a freshly bought purchase answers with the
   * same shape, and the same refund reasoning, as one read back later.
   */
  private async decoratePurchases(
    communityId: string,
    viewerId: string,
    purchases: PurchaseWithLines[],
    isStaff = false,
  ) {
    const decorated = await this.decorateLines(
      communityId,
      viewerId,
      purchases.flatMap((p) =>
        p.lines.map((line) => ({
          ...line,
          buyerId: p.buyerId,
          purchasedAt: p.createdAt,
        })),
      ),
      isStaff,
    );
    if (decorated.length === 0) return [];

    const byPurchase = new Map<string, (typeof decorated)[number][]>();
    for (const line of decorated) {
      const bucket = byPurchase.get(line.purchaseId);
      if (bucket) bucket.push(line);
      else byPurchase.set(line.purchaseId, [line]);
    }

    return purchases.map((purchase) => ({
      ...purchase,
      buyer: mapPrismaUserToGraphQL(purchase.buyer),
      lines: byPurchase.get(purchase.id) ?? [],
    }));
  }

  /**
   * Attach the per-viewer fields to a flat set of lines.
   *
   * A line is what a buyer actually counts -- "I bought ten things" -- so it
   * is the level a history pages and filters at. Purchases are the transaction
   * that produced them, and grouping back into one is the caller's job.
   *
   * Every lookup here is one query for the whole set rather than one per line,
   * which is the reason this is not simply done inside the map below.
   */
  private async decorateLines(
    communityId: string,
    viewerId: string,
    lines: Array<
      PurchaseWithLines["lines"][number] & {
        buyerId: string;
        purchasedAt: Date;
      }
    >,
    isStaff = false,
  ) {
    const lineIds = lines.map((l) => l.id);
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

    // A line shows the listing it bought, and that listing is a full
    // `ShopItem` -- so it owes the same per-viewer fields the storefront does.
    // Decorated once for the distinct listings rather than once per line,
    // since buying three of something is three lines naming one listing.
    const listings = await this.decorateItems(
      communityId,
      viewerId,
      dedupeById(lines.map((l) => l.shopItem)),
    );
    const listingById = new Map(listings.map((l) => [l.id, l]));

    const now = Date.now();

    return lines.map((line) => {
      const blocked = refundBlockedReason(
        line,
        itemById.get(itemByLine.get(line.id) ?? ""),
        now,
        viewerId,
        isStaff,
      );
      const listing = listingById.get(line.shopItemId);
      if (!listing) {
        // Impossible: the map was built from these very lines. Thrown rather
        // than falling back to the undecorated row, because that fallback is
        // what produces a null non-nullable field.
        throw new Error(`Listing ${line.shopItemId} vanished mid-request`);
      }
      return {
        ...line,
        shopItem: listing,
        refundedBy: line.refundedBy
          ? mapPrismaUserToGraphQL(line.refundedBy)
          : null,
        refundableByViewer: blocked === null,
        refundBlockedReason: blocked,
      };
    });
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

    // Summed per listing, not per line. The per-line cap in the DTO is not
    // enough on its own: the same listing may legitimately appear on several
    // lines when it was bought at different price options, and eleven of one
    // thing split across two lines is still eleven.
    const perItem = new Map<string, number>();
    for (const line of lines) {
      const total = (perItem.get(line.shopItemId) ?? 0) + line.quantity;
      if (total > MAX_UNITS_PER_ITEM) {
        throw new BadRequestException(
          `You may buy at most ${MAX_UNITS_PER_ITEM} of one thing at a time`,
        );
      }
      perItem.set(line.shopItemId, total);
    }

    const purchaseId = randomUUID();

    const purchase = await this.db.$transaction(async (tx) => {
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
        include: PURCHASE_INCLUDE,
      });
    });

    // Decorated after the commit, not inside it. The per-viewer fields are
    // read-only and the balances they depend on have just changed, so they
    // want the committed state -- and doing it here keeps the transaction as
    // short as the writes require.
    const [decorated] = await this.decoratePurchases(communityId, buyerId, [
      purchase,
    ]);
    return decorated;
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

    // Coin cannot be paid to somebody outside the community, so a refund to a
    // departed buyer cannot complete. Said here, where the answer names the
    // problem -- the ledger's own check fires deep inside the transaction and
    // can only name a user id.
    // Membership hangs off the role, not off the community directly.
    const stillAMember = await this.db.communityMember.findFirst({
      where: {
        userId: line.purchase.buyerId,
        role: { communityId: line.purchase.communityId },
      },
      select: { id: true },
    });
    if (!stillAMember) {
      throw new ConflictException(
        "The buyer has left this community, so the coin cannot be returned",
      );
    }

    const refunded = await this.db.$transaction(async (tx) => {
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

      // The buyer is named explicitly: the ownership check above ran before
      // this transaction opened, and a trade landing in between would
      // otherwise take the item out of its new owner's hands.
      await this.items.destroyItems(
        tx,
        [grant.itemId],
        { actorUserId: actorId, reason: "Shop purchase refunded" },
        ItemTransactionSource.SHOP_PURCHASE,
        lineId,
        line.purchase.buyerId,
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
          // Not skipNonMembers. A buyer who has left the community cannot be
          // paid, and skipping the credit would destroy their item and give
          // nothing back while reporting success. Failing here rolls the whole
          // refund back and leaves them holding the item instead.
          skipNonMembers: false,
        });
      }

      return tx.shopPurchaseLine.findUniqueOrThrow({
        where: { id: lineId },
        include: { ...PURCHASE_LINE_INCLUDE, purchase: true },
      });
    });

    // Answered through the same decoration the purchase list uses, so a
    // refunded line reads identically whether it came back from the mutation
    // or from a refetch afterwards.
    const [listing] = await this.decorateItems(
      refunded.purchase.communityId,
      actorId,
      [refunded.shopItem],
    );
    const blocked = refundBlockedReason(
      { ...refunded, buyerId: refunded.purchase.buyerId },
      undefined,
      Date.now(),
      actorId,
    );
    return {
      ...refunded,
      shopItem: listing,
      purchasedAt: refunded.purchase.createdAt,
      refundedBy: refunded.refundedBy
        ? mapPrismaUserToGraphQL(refunded.refundedBy)
        : null,
      refundableByViewer: false,
      refundBlockedReason: blocked,
    };
  }
}

/** First occurrence wins; they are the same row read more than once. */
function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
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
  isStaff = false,
): string | null {
  // Two of the reasons are the buyer's alone. Staff may refund somebody
  // else's purchase, and at any age -- that is the whole point of the window
  // being fifteen minutes rather than forever.
  if (!isStaff) {
    if (line.buyerId !== viewerId) return "This is not your purchase";
    if (!line.refundedAt && now - line.createdAt.getTime() > REFUND_WINDOW_MS) {
      return "The undo window has passed -- ask a moderator";
    }
  }

  if (line.refundedAt) return "Already refunded";

  // What is left is what makes a refund impossible for anyone: there has to
  // be an item, it has to still exist, and the buyer has to still hold it.
  if (!item) return "Nothing to give back";
  if (item.destroyedAt) return "That item has been used or destroyed";
  if (item.ownerId !== line.buyerId) return "That item has changed hands";
  return null;
}
