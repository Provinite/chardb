import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { Prisma, CurrencyTransactionKind } from "@chardb/database";
import { DatabaseService } from "../database/database.service";
import { CreateCurrencyInput, UpdateCurrencyInput } from "./dto/currency.dto";

/** Postgres unique violation, surfaced by Prisma. */
const UNIQUE_VIOLATION = "P2002";

@Injectable()
export class CurrenciesService {
  constructor(private readonly db: DatabaseService) {}

  async findByCommunity(communityId: string, includeArchived = false) {
    return this.db.currency.findMany({
      where: {
        communityId,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
    });
  }

  async findById(id: string) {
    return this.db.currency.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string) {
    const currency = await this.findById(id);
    if (!currency) {
      throw new NotFoundException(`Currency ${id} not found`);
    }
    return currency;
  }

  async create(input: CreateCurrencyInput) {
    try {
      return await this.db.currency.create({
        data: {
          communityId: input.communityId,
          name: input.name.trim(),
          // Stored uppercase so "hc" and "HC" cannot both exist in one
          // community and read as the same thing everywhere they are shown.
          code: input.code.trim().toUpperCase(),
          symbol: input.symbol?.trim() || null,
          description: input.description?.trim() || null,
          colorId: input.colorId ?? null,
        },
      });
    } catch (error) {
      throw this.asFriendlyConflict(error, input.name, input.code);
    }
  }

  async update(id: string, input: UpdateCurrencyInput) {
    const currency = await this.findByIdOrThrow(id);

    const data: Prisma.CurrencyUpdateInput = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.code !== undefined) data.code = input.code.trim().toUpperCase();
    if (input.symbol !== undefined) data.symbol = input.symbol?.trim() || null;
    if (input.description !== undefined) {
      data.description = input.description?.trim() || null;
    }
    if (input.colorId !== undefined) {
      data.color = input.colorId
        ? { connect: { id: input.colorId } }
        : { disconnect: true };
    }
    if (input.archived !== undefined) {
      data.archivedAt = input.archived ? new Date() : null;
    }

    try {
      return await this.db.currency.update({ where: { id }, data });
    } catch (error) {
      throw this.asFriendlyConflict(
        error,
        input.name ?? currency.name,
        input.code ?? currency.code,
      );
    }
  }

  /**
   * Turn a unique-constraint error into something a form can show.
   *
   * Name and code are separately unique per community, and the raw Prisma
   * message names a database index rather than the field the user typed into.
   */
  private asFriendlyConflict(error: unknown, name: string, code: string) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION
    ) {
      const target = String(error.meta?.target ?? "");
      if (target.includes("code")) {
        return new ConflictException(
          `This community already has a currency with the code ${code.toUpperCase()}`,
        );
      }
      return new ConflictException(
        `This community already has a currency named ${name}`,
      );
    }
    return error;
  }

  /**
   * What each currency in a community is doing, in aggregate.
   *
   * Circulation is summed from balances rather than from the ledger: the
   * balance is the authoritative number, and summing a ledger that grows
   * forever to answer a question asked on every page load gets slower every
   * day for no gain.
   */
  async findSupply(communityId: string) {
    const currencies = await this.findByCommunity(communityId, true);
    if (currencies.length === 0) return [];

    const currencyIds = currencies.map((c) => c.id);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [balanceStats, holderCounts, recentMoves, largest] =
      await Promise.all([
        this.db.currencyBalance.groupBy({
          by: ["currencyId"],
          where: { currencyId: { in: currencyIds } },
          _sum: { amount: true },
        }),
        this.db.currencyBalance.groupBy({
          by: ["currencyId"],
          where: { currencyId: { in: currencyIds }, amount: { gt: 0 } },
          _count: { _all: true },
        }),
        this.db.currencyTransaction.groupBy({
          by: ["currencyId", "kind"],
          where: { currencyId: { in: currencyIds }, createdAt: { gte: since } },
          _sum: { amount: true },
        }),
        this.db.currencyBalance.groupBy({
          by: ["currencyId"],
          where: { currencyId: { in: currencyIds } },
          _max: { amount: true },
        }),
      ]);

    const sumByCurrency = new Map(
      balanceStats.map((r) => [r.currencyId, r._sum.amount ?? 0]),
    );
    const holdersByCurrency = new Map(
      holderCounts.map((r) => [r.currencyId, r._count._all]),
    );
    const maxByCurrency = new Map(
      largest.map((r) => [r.currencyId, r._max.amount ?? 0]),
    );

    const minted = new Map<string, number>();
    const removed = new Map<string, number>();
    for (const row of recentMoves) {
      const total = row._sum.amount ?? 0;
      if (row.kind === CurrencyTransactionKind.MINT) {
        minted.set(row.currencyId, (minted.get(row.currencyId) ?? 0) + total);
      } else if (
        row.kind === CurrencyTransactionKind.BURN ||
        row.kind === CurrencyTransactionKind.SPEND
      ) {
        // These are stored negative. Reported as a positive magnitude, because
        // "removed: -400" reads as a double negative on every surface.
        removed.set(
          row.currencyId,
          (removed.get(row.currencyId) ?? 0) + Math.abs(total),
        );
      }
      // TRANSFER is skipped on purpose: its two legs sum to zero, and moving
      // coin between members changes nothing about the supply.
    }

    return currencies.map((currency) => ({
      currency,
      inCirculation: sumByCurrency.get(currency.id) ?? 0,
      holders: holdersByCurrency.get(currency.id) ?? 0,
      mintedLast30Days: minted.get(currency.id) ?? 0,
      removedLast30Days: removed.get(currency.id) ?? 0,
      largestBalance: maxByCurrency.get(currency.id) ?? 0,
    }));
  }
}
