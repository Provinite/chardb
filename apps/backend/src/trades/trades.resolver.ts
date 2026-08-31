import { Resolver, Query, Mutation, Args, ID, Int } from "@nestjs/graphql";
import { BadRequestException } from "@nestjs/common";
import { TradesService } from "./trades.service";
import type { TradeRequestedItemInput } from "./trades.service";
import {
  EffectiveTradeStatus,
  Trade,
  TradeConnection,
} from "./entities/trade.entity";
import { CreateTradeInput, TradeSelectionInput } from "./dto/trade.dto";
import { mapTradeToGraphQL } from "./utils/trade-resolver-mappers";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";

/**
 * Every operation here is scoped to the caller. A trade is a private
 * conversation between two members until it settles, at which point the ledger
 * -- not this resolver -- is where it becomes everybody's business.
 */
@Resolver(() => Trade)
export class TradesResolver {
  constructor(private readonly trades: TradesService) {}

  @AllowAnyAuthenticated()
  @Query(() => TradeConnection, {
    name: "trades",
    description:
      "Your trades, newest first -- both the offers waiting on you and the " +
      "ones you have out.",
  })
  async findMine(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("communityId", { type: () => ID, nullable: true })
    communityId?: string,
    @Args("status", { type: () => EffectiveTradeStatus, nullable: true })
    status?: EffectiveTradeStatus,
    @Args("first", { type: () => Int, nullable: true, defaultValue: 20 })
    first?: number,
    @Args("after", { type: () => String, nullable: true }) after?: string,
  ): Promise<TradeConnection> {
    const page = await this.trades.findForMember(user.id, {
      communityId,
      status,
      first,
      after,
    });
    return { ...page, nodes: page.nodes.map(mapTradeToGraphQL) };
  }

  @AllowAnyAuthenticated()
  @Query(() => Trade, {
    name: "trade",
    description: "One of your trades. Readable by either party, nobody else.",
  })
  async findOne(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("id", { type: () => ID }) id: string,
  ): Promise<Trade> {
    return mapTradeToGraphQL(await this.trades.findOne(id, user.id));
  }

  @AllowAnyAuthenticated()
  @Mutation(() => Trade, {
    description:
      "Compose an offer. Nothing is reserved: what it names is checked now so " +
      "you are told early, and checked again decisively at accept.",
  })
  async proposeTrade(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("input") input: CreateTradeInput,
  ): Promise<Trade> {
    const trade = await this.trades.create(user.id, {
      communityId: input.communityId,
      recipientId: input.recipientId,
      offering: input.offering,
      requesting: input.requesting.map(toRequestedItem),
      coin: input.coin,
      note: input.note,
      expiresInDays: input.expiresInDays,
    });
    return mapTradeToGraphQL(await this.trades.findOne(trade.id, user.id));
  }

  @AllowAnyAuthenticated()
  @Mutation(() => Trade, {
    description:
      "Answer an offer with a different one. Declines the original and sends " +
      "the replacement in a single step, so opening a counter and thinking " +
      "better of it costs the offer nothing. Returns the new trade.",
  })
  async counterTrade(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("id", {
      type: () => ID,
      description: "The offer being answered. It is declined.",
    })
    id: string,
    @Args("input") input: CreateTradeInput,
  ): Promise<Trade> {
    const trade = await this.trades.counter(user.id, id, {
      communityId: input.communityId,
      recipientId: input.recipientId,
      offering: input.offering,
      requesting: input.requesting.map(toRequestedItem),
      coin: input.coin,
      note: input.note,
      expiresInDays: input.expiresInDays,
    });
    return mapTradeToGraphQL(await this.trades.findOne(trade.id, user.id));
  }

  @AllowAnyAuthenticated()
  @Mutation(() => Trade, {
    description:
      "Accept and settle. Items and coin move in one transaction across both " +
      "ledgers, or the whole accept fails.",
  })
  async acceptTrade(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("id", { type: () => ID }) id: string,
    @Args("selections", {
      type: () => [TradeSelectionInput],
      nullable: true,
      description:
        "Optional. Names which of your rows satisfy a by-type line. Leave it " +
        "out and rows are chosen for you, newest first -- by-type means any " +
        "will do, so there is usually nothing to decide.",
    })
    selections?: TradeSelectionInput[],
  ): Promise<Trade> {
    await this.trades.accept(id, user.id, selections ?? []);
    return mapTradeToGraphQL(await this.trades.findOne(id, user.id));
  }

  @AllowAnyAuthenticated()
  @Mutation(() => Trade, {
    description:
      "Refuse an offer. Nothing was held, so nothing is released. To refuse " +
      "and reply with your own terms, use counterTrade instead.",
  })
  async declineTrade(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("id", { type: () => ID }) id: string,
  ): Promise<Trade> {
    await this.trades.decline(id, user.id);
    return mapTradeToGraphQL(await this.trades.findOne(id, user.id));
  }

  @AllowAnyAuthenticated()
  @Mutation(() => Trade, { description: "Withdraw an offer you sent." })
  async cancelTrade(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("id", { type: () => ID }) id: string,
  ): Promise<Trade> {
    await this.trades.cancel(id, user.id);
    return mapTradeToGraphQL(await this.trades.findOne(id, user.id));
  }
}

/**
 * Narrow the flat GraphQL input to the union the service takes.
 *
 * GraphQL has no input unions, so the DTO carries all three fields and this is
 * where "a row or a type, never both" starts being true -- the same rule the
 * database holds as a CHECK.
 */
function toRequestedItem(input: {
  itemTypeId?: string;
  quantity?: number;
  itemId?: string;
}): TradeRequestedItemInput {
  const byType = input.itemTypeId !== undefined;
  const byRow = input.itemId !== undefined;

  if (byType === byRow) {
    throw new BadRequestException(
      "Request either an item type with a quantity, or one specific item -- not both, and not neither",
    );
  }
  if (byType) {
    if (input.quantity === undefined) {
      throw new BadRequestException("Requesting an item type needs a quantity");
    }
    return { itemTypeId: input.itemTypeId as string, quantity: input.quantity };
  }
  return { itemId: input.itemId as string };
}
