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

  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(9999)
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
  // No quantity: an item is one item. More means grantItem, fewer means
  // revokeItems -- and both of those write ledger rows, which is why neither
  // belongs behind an "update".
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
