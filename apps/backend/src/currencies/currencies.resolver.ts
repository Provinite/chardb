import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Int,
  ResolveField,
  Parent,
} from "@nestjs/graphql";
import { NotFoundException } from "@nestjs/common";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { AllowCommunityPermission } from "../auth/decorators/AllowCommunityPermission";
import { ResolveCommunityFrom } from "../auth/decorators/ResolveCommunityFrom";
import { CommunityPermission } from "../auth/CommunityPermission";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { PermissionService } from "../auth/PermissionService";
import { DatabaseService } from "../database/database.service";
import { CurrenciesService } from "./currencies.service";
import { CurrencyLedgerService } from "./currency-ledger.service";
import { Currency, CurrencySupply } from "./entities/currency.entity";
import {
  MemberWallet,
  CurrencyBalance,
} from "./entities/currency-balance.entity";
import {
  CurrencyTransaction,
  CurrencyTransactionConnection,
} from "./entities/currency-transaction.entity";
import {
  CreateCurrencyInput,
  UpdateCurrencyInput,
  MintCurrencyInput,
  BurnCurrencyInput,
  TransferCurrencyInput,
  CurrencyTransactionFiltersInput,
} from "./dto/currency.dto";
import {
  mapPrismaCurrencyToGraphQL,
  mapPrismaCurrencyTransactionConnectionToGraphQL,
} from "./utils/currency-resolver-mappers";
import { User } from "../users/entities/user.entity";
import { mapPrismaUserToGraphQL } from "../users/utils/user-resolver-mappers";

/**
 * Reading currency is gated on community membership; writing is gated on item
 * permissions.
 *
 * Balances and statements are visible to the whole community for the same
 * reason item provenance is: an economy nobody can inspect cannot be argued
 * with, and a member about to trade needs to see who actually holds what.
 *
 * Note the absence of @AllowAnyAuthenticated on the queries. The global guard
 * ORs every permission decorator together, so pairing it with a community
 * permission would mean "authenticated OR permitted" -- which is just
 * "authenticated", and the community check would never bind. That exact pairing
 * was the item-mutation authorization hole. Field resolvers do carry it,
 * because they are only reachable through a query that already gated.
 */
@Resolver(() => Currency)
export class CurrenciesResolver {
  constructor(
    private readonly currencies: CurrenciesService,
    private readonly ledger: CurrencyLedgerService,
  ) {}

  // ==================== Queries ====================

  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => [Currency], {
    name: "currencies",
    description: "Every currency a community defines. Readable by any member.",
  })
  async findAll(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("includeArchived", { type: () => Boolean, defaultValue: false })
    includeArchived: boolean,
  ): Promise<Currency[]> {
    const rows = await this.currencies.findByCommunity(
      communityId,
      includeArchived,
    );
    return rows.map(mapPrismaCurrencyToGraphQL);
  }

  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ currencyId: "id" })
  @Query(() => Currency, { name: "currency" })
  async findOne(@Args("id", { type: () => ID }) id: string): Promise<Currency> {
    const currency = await this.currencies.findByIdOrThrow(id);
    return mapPrismaCurrencyToGraphQL(currency);
  }

  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => [CurrencySupply], {
    name: "currencySupply",
    description:
      "Circulation, holders, and 30-day mint and removal volume per currency.",
  })
  async findSupply(
    @Args("communityId", { type: () => ID }) communityId: string,
  ): Promise<CurrencySupply[]> {
    const rows = await this.currencies.findSupply(communityId);
    return rows.map((row) => ({
      ...row,
      currency: mapPrismaCurrencyToGraphQL(row.currency),
    }));
  }

  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => MemberWallet, {
    name: "memberWallet",
    description:
      "What one member holds of every currency in a community, including the " +
      "ones they hold none of.",
  })
  async findWallet(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("userId", { type: () => ID }) userId: string,
  ): Promise<MemberWallet> {
    const wallet = await this.ledger.findWallet(communityId, userId);
    return {
      ...wallet,
      balances: wallet.balances.map((line) => ({
        ...line,
        currency: mapPrismaCurrencyToGraphQL(line.currency),
      })),
    };
  }

  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ communityId: "filters.communityId" })
  @Query(() => CurrencyTransactionConnection, {
    name: "currencyTransactions",
    description:
      "The currency ledger for one community, newest first. A transfer is two " +
      "rows sharing a batchId. Readable by any member.",
  })
  async findTransactions(
    @Args("filters") filters: CurrencyTransactionFiltersInput,
  ): Promise<CurrencyTransactionConnection> {
    const result = await this.ledger.findTransactions(filters);
    return mapPrismaCurrencyTransactionConnectionToGraphQL(result);
  }

  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ currencyId: "currencyId" })
  @Query(() => [CurrencyBalance], {
    name: "currencyHolders",
    description: "Who holds a currency, largest balance first.",
  })
  async findHolders(
    @Args("currencyId", { type: () => ID }) currencyId: string,
    @Args("limit", { type: () => Int, defaultValue: 50 }) limit: number,
    @Args("offset", { type: () => Int, defaultValue: 0 }) offset: number,
  ): Promise<CurrencyBalance[]> {
    const result = await this.ledger.findHolders(currencyId, limit, offset);
    return result.balances.map((balance) => ({
      id: balance.id,
      currency: mapPrismaCurrencyToGraphQL(balance.currency),
      userId: balance.userId,
      amount: balance.amount,
      updatedAt: balance.updatedAt,
    }));
  }

  // ==================== Definition mutations ====================

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "input.communityId" })
  @Mutation(() => Currency)
  async createCurrency(
    @Args("input") input: CreateCurrencyInput,
  ): Promise<Currency> {
    const currency = await this.currencies.create(input);
    return mapPrismaCurrencyToGraphQL(currency);
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ currencyId: "id" })
  @Mutation(() => Currency)
  async updateCurrency(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateCurrencyInput,
  ): Promise<Currency> {
    const currency = await this.currencies.update(id, input);
    return mapPrismaCurrencyToGraphQL(currency);
  }

  // ==================== Movement mutations ====================

  @AllowCommunityPermission(CommunityPermission.CanGrantItems)
  @ResolveCommunityFrom({ currencyId: "input.currencyId" })
  @Mutation(() => String, {
    name: "mintCurrency",
    description:
      "Create currency into one or more members' balances. Returns the batch " +
      "id every row it wrote shares.",
  })
  async mintCurrency(
    @Args("input") input: MintCurrencyInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<string> {
    return this.ledger.mint(input, user.id);
  }

  @AllowCommunityPermission(CommunityPermission.CanGrantItems)
  @ResolveCommunityFrom({ currencyId: "input.currencyId" })
  @Mutation(() => String, {
    name: "burnCurrency",
    description:
      "Remove currency from a member's balance. Refuses to take more than " +
      "they hold.",
  })
  async burnCurrency(
    @Args("input") input: BurnCurrencyInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<string> {
    return this.ledger.burn(input, user.id);
  }

  /**
   * Sending your own coin needs membership, not a permission.
   *
   * The balance itself is the authorisation: you cannot send what the CHECK
   * constraint will not let you go below zero to fund.
   */
  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ currencyId: "input.currencyId" })
  @Mutation(() => String, {
    name: "transferCurrency",
    description:
      "Send currency to another member. Writes both sides as one batch.",
  })
  async transferCurrency(
    @Args("input") input: TransferCurrencyInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<string> {
    return this.ledger.transfer(input, user.id);
  }
}

/**
 * Field resolvers for a currency transaction.
 *
 * Separate class because they hang off CurrencyTransaction rather than
 * Currency, and Nest resolves fields by the type named in @Resolver.
 */
@Resolver(() => CurrencyTransaction)
export class CurrencyTransactionFieldsResolver {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly database: DatabaseService,
  ) {}

  /**
   * Re-read per viewer rather than carried on the mapped entity, so a caller
   * that forgets to strip it cannot leak one. Returns null -- not an error --
   * for viewers without item permissions: the row is legitimately visible to
   * them, only this field is not.
   */
  @AllowAnyAuthenticated()
  @ResolveField(() => String, {
    name: "staffNote",
    nullable: true,
    description:
      "Staff-only note. Null unless the viewer holds canManageItems or " +
      "canGrantItems in this community.",
  })
  async resolveStaffNote(
    @Parent() transaction: CurrencyTransaction,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<string | null> {
    const currency = await this.database.currency.findUnique({
      where: { id: transaction.currencyId },
      select: { communityId: true },
    });
    if (!currency) return null;

    const [canManage, canGrant] = await Promise.all([
      this.permissionService.hasCommunityPermission(
        user.id,
        currency.communityId,
        CommunityPermission.CanManageItems,
      ),
      this.permissionService.hasCommunityPermission(
        user.id,
        currency.communityId,
        CommunityPermission.CanGrantItems,
      ),
    ]);

    if (!canManage && !canGrant) return null;

    const row = await this.database.currencyTransaction.findUnique({
      where: { id: transaction.id },
      select: { staffNote: true },
    });
    return row?.staffNote ?? null;
  }

  @AllowAnyAuthenticated()
  @ResolveField(() => Currency, { name: "currency" })
  async resolveCurrency(
    @Parent() transaction: CurrencyTransaction,
  ): Promise<Currency> {
    const currency = await this.database.currency.findUnique({
      where: { id: transaction.currencyId },
    });
    if (!currency) {
      throw new NotFoundException(
        `Currency with ID ${transaction.currencyId} not found`,
      );
    }
    return mapPrismaCurrencyToGraphQL(currency);
  }

  @AllowAnyAuthenticated()
  @ResolveField(() => User, { name: "user", nullable: true })
  resolveUser(@Parent() transaction: CurrencyTransaction) {
    return this.loadUser(transaction.userId);
  }

  @AllowAnyAuthenticated()
  @ResolveField(() => User, { name: "counterparty", nullable: true })
  resolveCounterparty(@Parent() transaction: CurrencyTransaction) {
    return this.loadUser(transaction.counterpartyId);
  }

  @AllowAnyAuthenticated()
  @ResolveField(() => User, { name: "actorUser", nullable: true })
  resolveActorUser(@Parent() transaction: CurrencyTransaction) {
    return this.loadUser(transaction.actorUserId);
  }

  private async loadUser(userId?: string | null): Promise<User | null> {
    if (!userId) return null;
    const user = await this.database.user.findUnique({ where: { id: userId } });
    return user ? mapPrismaUserToGraphQL(user) : null;
  }
}

/** The member behind a balance row, for holder lists. */
@Resolver(() => CurrencyBalance)
export class CurrencyBalanceFieldsResolver {
  constructor(private readonly database: DatabaseService) {}

  @AllowAnyAuthenticated()
  @ResolveField(() => User, { name: "user", nullable: true })
  async resolveUser(@Parent() balance: CurrencyBalance): Promise<User | null> {
    const user = await this.database.user.findUnique({
      where: { id: balance.userId },
    });
    return user ? mapPrismaUserToGraphQL(user) : null;
  }
}
