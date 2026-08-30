import { InputType, Field, ID, Int, registerEnumType } from "@nestjs/graphql";
import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsDate,
  IsInt,
  IsArray,
  Min,
  Max,
  ArrayMaxSize,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ModerationStatus, ModerationRejectionReason } from "@prisma/client";

// Register enums with GraphQL
registerEnumType(ModerationStatus, {
  name: "ModerationStatus",
  description: "The moderation status of an image",
});

registerEnumType(ModerationRejectionReason, {
  name: "ModerationRejectionReason",
  description: "The reason for rejecting an image",
});

@InputType()
export class ImageModerationQueueFiltersInput {
  @Field(() => ID, { nullable: true, description: "Filter by uploader ID" })
  @IsOptional()
  @IsUUID()
  uploaderId?: string;

  @Field({
    nullable: true,
    description: "Filter images uploaded after this date",
  })
  @IsOptional()
  @IsDate()
  uploadedAfter?: Date;

  @Field({
    nullable: true,
    description: "Filter images uploaded before this date",
  })
  @IsOptional()
  @IsDate()
  uploadedBefore?: Date;
}

/** One person and what approving this upload should pay them. */
@InputType()
export class ImageAwardInput {
  @Field(() => ID)
  @IsUUID()
  userId: string;

  @Field(() => Int, { description: "Positive. Omit the entry to pay nothing." })
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  amount: number;
}

@InputType()
export class ApproveImageInput {
  @Field(() => ID, { description: "The ID of the image to approve" })
  @IsUUID()
  imageId: string;

  /**
   * Optional currency reward, paid in the same transaction as the approval.
   *
   * One currency for the whole approval with a per-person amount, rather than
   * a currency each: paying the artist more than the uploader is a real case,
   * paying them in different currencies is not.
   */
  @Field(() => ID, {
    nullable: true,
    description:
      "Required when awards are given. Must belong to this community.",
  })
  @IsOptional()
  @IsUUID()
  currencyId?: string;

  @Field(() => [ImageAwardInput], {
    nullable: true,
    description:
      "Who to pay and how much. Requires canGrantItems; recipients who are " +
      "not members of the community are skipped rather than refused.",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ImageAwardInput)
  awards?: ImageAwardInput[];

  @Field({
    nullable: true,
    description: "Staff-only note recorded on the reward's ledger rows.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  staffNote?: string;
}

@InputType()
export class RejectImageInput {
  @Field(() => ID, { description: "The ID of the image to reject" })
  @IsUUID()
  imageId: string;

  @Field(() => ModerationRejectionReason, {
    description: "The reason for rejection",
  })
  @IsEnum(ModerationRejectionReason)
  reason: ModerationRejectionReason;

  @Field({
    nullable: true,
    description:
      "Additional details about the rejection (required when reason is OTHER)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reasonText?: string;
}
