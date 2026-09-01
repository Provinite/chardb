import { Field, InputType, Int, ID } from "@nestjs/graphql";
import { Prisma } from "@chardb/database";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Max,
} from "class-validator";

/**
 * What to use, and anything that use needs to know.
 *
 * An input object rather than a bare `itemId` argument, because using is going
 * to grow arguments. Paying out needs nothing beyond the item; an MYO ticket
 * will need a species and a variant, an edit ticket a character and a trait.
 * Optional fields can be added to an input type without breaking a caller; a
 * new required *argument* on a mutation cannot.
 */
@InputType()
export class UseItemInput {
  @Field(() => ID)
  @IsUUID()
  itemId: string;
}

@InputType({
  description:
    "One currency and how much of it using this item pays. Name each " +
    "currency once; say the total rather than listing it twice.",
})
export class ItemUsePayoutComponentInput {
  @Field(() => ID)
  @IsUUID()
  currencyId: string;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  amount: number;
}

@InputType()
export class CreateItemTypeInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Field(() => ID)
  @IsUUID()
  communityId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @Field({ defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isTradeable?: boolean;

  @Field({ defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isConsumable?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconUrl?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  imageId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  colorId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metadata?: Prisma.InputJsonValue;
}

@InputType()
export class UpdateItemTypeInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isTradeable?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isConsumable?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconUrl?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  imageId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  colorId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metadata?: Prisma.InputJsonValue;
}

@InputType()
export class ItemTypeFiltersInput {
  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  communityId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}

// Export for service use
export interface ItemTypeFilters {
  limit?: number;
  offset?: number;
  communityId?: string;
  category?: string;
  search?: string;
}
