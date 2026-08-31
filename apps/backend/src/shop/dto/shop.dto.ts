import { InputType, Field, ID, Int } from "@nestjs/graphql";
import {
  IsUUID,
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  MaxLength,
  ArrayNotEmpty,
  ArrayMaxSize,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ShopPurchaseLineStatus } from "../entities/shop.entity";

/**
 * How many of one listing a single checkout may buy.
 *
 * A bound on the work one request can ask for, not a game rule -- a listing
 * that should be scarce says so with `stock` or `maxPerUser`. Every unit is
 * its own item row, its own purchase line, and its own ledger entry, all
 * written inside one transaction, so an unbounded quantity is an unbounded
 * transaction holding a pool connection.
 */
export const MAX_UNITS_PER_ITEM = 10;

@InputType()
export class ShopPriceComponentInput {
  @Field(() => ID)
  @IsUUID()
  currencyId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  amount: number;
}

@InputType({
  description:
    "One way to pay. Several components means one price asking for several " +
    "currencies at once, not several alternative prices.",
})
export class ShopPriceInput {
  @Field(() => [ShopPriceComponentInput])
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ShopPriceComponentInput)
  components: ShopPriceComponentInput[];
}

@InputType()
export class CreateShopItemInput {
  @Field(() => ID)
  @IsUUID()
  communityId: string;

  @Field(() => ID, { description: "What buying this grants." })
  @IsUUID()
  itemTypeId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Field(() => Int, { nullable: true, description: "Omit for unlimited." })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @Field(() => Int, { nullable: true, description: "Omit for no cap." })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPerUser?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @Field(() => [ShopPriceInput], {
    description: "At least one, or nobody can buy it.",
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ShopPriceInput)
  prices: ShopPriceInput[];
}

@InputType()
export class UpdateShopItemInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPerUser?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @Field(() => [ShopPriceInput], {
    nullable: true,
    description:
      "Replaces every option when given. Past purchases keep what they paid, " +
      "which is copied onto the line rather than read back through here.",
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ShopPriceInput)
  prices?: ShopPriceInput[];
}

@InputType()
export class CheckoutLineInputDto {
  @Field(() => ID)
  @IsUUID()
  shopItemId: string;

  @Field(() => ID, { description: "Which price option was chosen." })
  @IsUUID()
  shopPriceId: string;

  @Field(() => Int, {
    description: "At most ten. The same limit applies across lines.",
  })
  @IsInt()
  @Min(1)
  @Max(MAX_UNITS_PER_ITEM)
  quantity: number;
}

@InputType()
export class CheckoutInput {
  @Field(() => ID)
  @IsUUID()
  communityId: string;

  @Field(() => [CheckoutLineInputDto], {
    description:
      "The cart. Prices are re-read server-side; this only says which option " +
      "was picked, never what it costs.",
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineInputDto)
  lines: CheckoutLineInputDto[];
}

/**
 * What a buyer is looking for in their own purchase history.
 *
 * Mirrors the ledger's filter inputs: one required community, a bounded page,
 * and the narrowing terms beside them. Filtering server-side rather than in
 * the page is the point -- a search that only looked at the rows already
 * fetched would answer about the page rather than the history.
 */
@InputType()
export class ShopPurchaseLineFiltersInput {
  @Field(() => ID, {
    description: "Required. A purchase history is always one community's.",
  })
  @IsUUID()
  communityId: string;

  @Field(() => Int, { defaultValue: 25 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @Field(() => String, {
    nullable: true,
    description:
      "Matches the listing's name, or its item type's name when the listing " +
      "does not override it -- whichever the buyer actually saw on the card.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @Field(() => ShopPurchaseLineStatus, {
    nullable: true,
    description: "Omit for both.",
  })
  @IsOptional()
  @IsEnum(ShopPurchaseLineStatus)
  status?: ShopPurchaseLineStatus;
}
