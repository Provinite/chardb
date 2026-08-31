import { Field, InputType, Int, ID } from "@nestjs/graphql";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsEnum,
  IsArray,
  Min,
  Max,
  MaxLength,
} from "class-validator";
import { ItemTransactionKind, ItemTransactionSource } from "@chardb/database";

@InputType()
export class ItemTransactionFiltersInput {
  @Field(() => ID, {
    description: "Required. The ledger is always scoped to one community.",
  })
  @IsUUID()
  communityId: string;

  @Field(() => Int, { defaultValue: 25 })
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

  @Field(() => [ItemTransactionKind], {
    nullable: true,
    description: "Match any of these kinds. Omit for all kinds.",
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ItemTransactionKind, { each: true })
  kinds?: ItemTransactionKind[];

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  itemTypeId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @Field(() => ID, {
    nullable: true,
    description:
      "Matches rows where this user is the source, the recipient, or the actor.",
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @Field(() => String, {
    nullable: true,
    description:
      "Matches item type name, public reason, and actor label. Never searches " +
      "staff notes -- a member must not be able to probe for hidden text.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

/** Service-side shape. Mirrors the input without the GraphQL decorators. */
export interface ItemTransactionFilters {
  communityId: string;
  limit?: number;
  offset?: number;
  kinds?: ItemTransactionKind[];
  itemTypeId?: string;
  itemId?: string;
  userId?: string;
  search?: string;
}

/**
 * What a caller hands the ledger when something moves.
 *
 * Not a GraphQL input: nothing writes the ledger directly. Rows are a side
 * effect of an item mutation, produced inside the same database transaction.
 *
 * One event, many items: `itemIds` is the whole batch, and every row it writes
 * shares a batch id.
 */
export interface RecordItemBatchInput {
  communityId: string;
  itemTypeId: string;
  itemIds: string[];
  kind: ItemTransactionKind;
  /** Supply one to tie this batch to rows written by an earlier call. */
  batchId?: string;
  fromUserId?: string | null;
  toUserId?: string | null;
  actorUserId?: string | null;
  actorLabel?: string | null;
  reason?: string | null;
  staffNote?: string | null;
  /**
   * What caused this batch, when something other than a person did.
   *
   * The pair is enforced by a CHECK constraint: DIRECT exactly when sourceId
   * is null.
   */
  source?: ItemTransactionSource;
  sourceId?: string | null;
}
