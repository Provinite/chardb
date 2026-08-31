import { Field, InputType, Int, ID } from "@nestjs/graphql";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
  Max,
  MaxLength,
  ValidateNested,
  IsNotEmpty,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";
import { Prisma } from "@chardb/database";
import { PendingOwnerInput } from "../../pending-ownership/dto/pending-ownership.dto";

/**
 * How many of one item type a single grant may create.
 *
 * Items do not stack, so a grant of N is N rows in `items` and N in the ledger,
 * every one of which then has to be listed in an inventory and rendered. The
 * previous ceiling was 9,999, which nothing downstream was built to absorb --
 * a staff member granting a thousand of something watched the request hang and
 * pressed the button again, which is how this was reported.
 *
 * 100 is generous for what grants are actually for, handing out event rewards,
 * and two orders of magnitude below where it was.
 */
export const MAX_GRANT_QUANTITY = 100;

@InputType()
export class GrantItemInput {
  @Field(() => ID)
  @IsUUID()
  itemTypeId: string;

  @Field(() => ID, {
    nullable: true,
    description:
      "User ID to grant item to. Required if pendingOwner is not provided.",
  })
  @ValidateIf((o) => !o.pendingOwner)
  @IsNotEmpty({ message: "Items must have either userId or pendingOwner" })
  @IsUUID()
  userId?: string;

  @Field(() => Int, {
    defaultValue: 1,
    description: `How many to create. At most ${MAX_GRANT_QUANTITY}.`,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(MAX_GRANT_QUANTITY)
  quantity?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metadata?: Prisma.InputJsonValue; // Instance-specific data

  @Field(() => PendingOwnerInput, {
    nullable: true,
    description: "Create item with pending ownership for an external account",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PendingOwnerInput)
  pendingOwner?: PendingOwnerInput;

  @Field(() => String, {
    nullable: true,
    description:
      "Member-facing note recorded on the ledger. Visible to anyone who can " +
      "read the community's item history.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @Field(() => String, {
    nullable: true,
    description:
      "Staff-only detail recorded on the ledger. Never shown to members.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  staffNote?: string;
}

@InputType()
export class UpdateItemInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  metadata?: Prisma.InputJsonValue;
}

@InputType()
export class ItemFiltersInput {
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
  ownerId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  itemTypeId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  communityId?: string;
}

// Export for service use
export interface ItemFilters {
  limit?: number;
  offset?: number;
  ownerId?: string;
  itemTypeId?: string;
  communityId?: string;
}
