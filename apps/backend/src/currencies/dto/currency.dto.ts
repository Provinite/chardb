import { Field, InputType, Int, ID } from "@nestjs/graphql";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  IsEnum,
  IsArray,
  Min,
  Max,
  MaxLength,
  Matches,
  ArrayMaxSize,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { CurrencyTransactionKind } from "@chardb/database";
import { PendingOwnerInput } from "../../pending-ownership/dto/pending-ownership.dto";

@InputType()
export class CreateCurrencyInput {
  @Field(() => ID)
  @IsUUID()
  communityId: string;

  @Field()
  @IsString()
  @MaxLength(50)
  name: string;

  @Field({
    description:
      "Short display code, unique within the community. Letters and digits " +
      "only, stored uppercase.",
  })
  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Za-z0-9]{1,10}$/, {
    message: "code must be 1-10 letters or digits",
  })
  code: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  symbol?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  colorId?: string;

  @Field({
    nullable: true,
    defaultValue: true,
    description:
      "Whether members may hand this to each other. Defaults to true, which " +
      "is what a currency normally is.",
  })
  @IsOptional()
  @IsBoolean()
  isTradeable?: boolean;
}

@InputType()
export class UpdateCurrencyInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Za-z0-9]{1,10}$/, {
    message: "code must be 1-10 letters or digits",
  })
  code?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  symbol?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  colorId?: string;

  @Field({
    nullable: true,
    description:
      "Whether members may hand this to each other, by trade or by a direct " +
      "send. Turning it off leaves every existing balance alone and stops " +
      "only new movement between members.",
  })
  @IsOptional()
  @IsBoolean()
  isTradeable?: boolean;

  @Field({
    nullable: true,
    description:
      "Archive or restore. An archived currency takes no new transactions " +
      "but keeps every balance and statement row readable.",
  })
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

/**
 * Hand coin to one or more members.
 *
 * Takes a list because a prize round hands the same amount to everyone who
 * placed, and that should land as one event in the ledger rather than as
 * eleven unrelated ones.
 */
@InputType()
export class MintCurrencyInput {
  @Field(() => ID)
  @IsUUID()
  currencyId: string;

  @Field(() => [ID], {
    nullable: true,
    description:
      "Members who receive it. With pendingOwners, at least one recipient " +
      "in all.",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID("4", { each: true })
  userIds?: string[];

  @Field(() => [PendingOwnerInput], {
    nullable: true,
    description:
      "External accounts who receive it: a Discord id or username, or a " +
      "DeviantArt handle. An account linked by a member here is paid at " +
      "once; any other waits on the account until its person links it and " +
      "joins.",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PendingOwnerInput)
  pendingOwners?: PendingOwnerInput[];

  @Field(() => Int, {
    description: "How much each named member receives. Positive.",
  })
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  amount: number;

  @Field({ description: "Member-facing. Required, because it is public." })
  @IsString()
  @MaxLength(500)
  reason: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  staffNote?: string;
}

/** Take coin back. Always a correction, so the public reason is required. */
@InputType()
export class BurnCurrencyInput {
  @Field(() => ID)
  @IsUUID()
  currencyId: string;

  @Field(() => ID)
  @IsUUID()
  userId: string;

  @Field(() => Int, {
    description: "How much to remove, as a positive number.",
  })
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  amount: number;

  @Field({ description: "Member-facing. Required, because it is public." })
  @IsString()
  @MaxLength(500)
  reason: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  staffNote?: string;
}

/** Move coin between two members. Needs no permission beyond holding it. */
@InputType()
export class TransferCurrencyInput {
  @Field(() => ID)
  @IsUUID()
  currencyId: string;

  @Field(() => ID, { description: "Who receives it." })
  @IsUUID()
  toUserId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  amount: number;

  @Field({ nullable: true, description: "Member-facing note on the transfer." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

@InputType()
export class CurrencyTransactionFiltersInput {
  @Field(() => ID, {
    description: "Required. A statement is always scoped to one community.",
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

  @Field(() => [CurrencyTransactionKind], {
    nullable: true,
    description: "Match any of these kinds. Omit for all kinds.",
  })
  @IsOptional()
  @IsArray()
  @IsEnum(CurrencyTransactionKind, { each: true })
  kinds?: CurrencyTransactionKind[];

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  currencyId?: string;

  @Field(() => ID, {
    nullable: true,
    description:
      "Matches rows where this user owns the row, is the counterparty, or " +
      "is the actor.",
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @Field(() => String, {
    nullable: true,
    description:
      "Matches currency name and public reason. Never searches staff notes " +
      "-- a member must not be able to probe for hidden text.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

/** Service-side shape. Mirrors the input without the GraphQL decorators. */
export interface CurrencyTransactionFilters {
  communityId: string;
  limit?: number;
  offset?: number;
  kinds?: CurrencyTransactionKind[];
  currencyId?: string;
  userId?: string;
  search?: string;
}
