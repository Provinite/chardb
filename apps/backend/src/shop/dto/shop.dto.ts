import { InputType, Field, ID, Int } from "@nestjs/graphql";
import {
  IsUUID,
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  ArrayNotEmpty,
  ArrayMaxSize,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

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

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(100)
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
