import { Field, ID, InputType, Int } from "@nestjs/graphql";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

@InputType({
  description:
    "A row the proposer hands over. Always a specific item: the proposer is " +
    "at the composer, so they are the giver who gets to choose.",
})
export class OfferedTradeItemInput {
  @Field(() => ID)
  @IsString()
  itemId: string;
}

@InputType({
  description:
    "Something the proposer asks for. Give itemTypeId and quantity for the " +
    "usual case -- any rows of that type will do, and the recipient chooses " +
    "which when they accept. Give itemId only when one particular item's " +
    "history is the point.",
})
export class RequestedTradeItemInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  itemTypeId?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  itemId?: string;
}

@InputType({ description: "Coin on the table, in one direction." })
export class TradeCoinInput {
  @Field(() => ID)
  @IsString()
  currencyId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  amount: number;

  // @IsBoolean is load-bearing, not decoration: the global pipe runs with
  // `whitelist` and `forbidNonWhitelisted`, so a property carrying no
  // class-validator decorator is stripped and then rejected. A DTO field
  // without one fails every request that sets it.
  @IsBoolean()
  @Field({
    description:
      "True when the proposer pays it, false when they are asking for it. " +
      "Amounts in the same currency on both sides are netted.",
  })
  fromProposer: boolean;
}

@InputType()
export class CreateTradeInput {
  @Field(() => ID)
  @IsString()
  communityId: string;

  @Field(() => ID)
  @IsString()
  recipientId: string;

  @Field(() => [OfferedTradeItemInput], { defaultValue: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferedTradeItemInput)
  offering: OfferedTradeItemInput[];

  @Field(() => [RequestedTradeItemInput], { defaultValue: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequestedTradeItemInput)
  requesting: RequestedTradeItemInput[];

  @Field(() => [TradeCoinInput], { defaultValue: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TradeCoinInput)
  coin: TradeCoinInput[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInDays?: number;
}

@InputType({
  description:
    "Which of your rows satisfy one by-type line. Optional -- omit it and " +
    "rows are chosen for you, newest first. Supply it when one particular " +
    "copy is one you would rather keep.",
})
export class TradeSelectionInput {
  @Field(() => ID, { description: "The TradeItem line being satisfied." })
  @IsString()
  tradeItemId: string;

  @Field(() => [ID], {
    description: "Exactly as many rows as the line's quantity.",
  })
  @IsArray()
  @IsString({ each: true })
  itemIds: string[];
}
