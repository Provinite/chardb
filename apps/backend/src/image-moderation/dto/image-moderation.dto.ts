import { InputType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { IsUUID, IsEnum, IsOptional, IsString, MaxLength, IsDate } from 'class-validator';
import { ModerationStatus, ModerationRejectionReason } from '@prisma/client';

// Register enums with GraphQL
registerEnumType(ModerationStatus, {
  name: 'ModerationStatus',
  description: 'The moderation status of an image',
});

registerEnumType(ModerationRejectionReason, {
  name: 'ModerationRejectionReason',
  description: 'The reason for rejecting an image',
});

@InputType()
export class ImageModerationQueueFiltersInput {
  @Field(() => ID, { nullable: true, description: 'Filter by uploader ID' })
  @IsOptional()
  @IsUUID()
  uploaderId?: string;

  @Field({ nullable: true, description: 'Filter images uploaded after this date' })
  @IsOptional()
  @IsDate()
  uploadedAfter?: Date;

  @Field({ nullable: true, description: 'Filter images uploaded before this date' })
  @IsOptional()
  @IsDate()
  uploadedBefore?: Date;
}

@InputType()
export class ApproveImageInput {
  @Field(() => ID, { description: 'The ID of the image to approve' })
  @IsUUID()
  imageId: string;
}

@InputType()
export class RejectImageInput {
  @Field(() => ID, { description: 'The ID of the image to reject' })
  @IsUUID()
  imageId: string;

  @Field(() => ModerationRejectionReason, { description: 'The reason for rejection' })
  @IsEnum(ModerationRejectionReason)
  reason: ModerationRejectionReason;

  @Field({ nullable: true, description: 'Additional details about the rejection (required when reason is OTHER)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reasonText?: string;
}
