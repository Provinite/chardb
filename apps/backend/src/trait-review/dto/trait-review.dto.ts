import { InputType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { IsUUID, IsOptional, IsString, MaxLength, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TraitReviewSource, ModerationStatus } from '@prisma/client';
import { CharacterTraitValueInput } from '../../characters/dto/character-trait.dto';

// Register TraitReviewSource enum with GraphQL
registerEnumType(TraitReviewSource, {
  name: 'TraitReviewSource',
  description: 'The source that triggered a trait review',
});

@InputType()
export class TraitReviewQueueFiltersInput {
  @Field(() => ModerationStatus, { nullable: true, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(ModerationStatus)
  status?: ModerationStatus;

  @Field(() => TraitReviewSource, { nullable: true, description: 'Filter by source' })
  @IsOptional()
  @IsEnum(TraitReviewSource)
  source?: TraitReviewSource;
}

@InputType()
export class ApproveTraitReviewInput {
  @Field(() => ID, { description: 'The ID of the review to approve' })
  @IsUUID()
  reviewId: string;
}

@InputType()
export class RejectTraitReviewInput {
  @Field(() => ID, { description: 'The ID of the review to reject' })
  @IsUUID()
  reviewId: string;

  @Field({ description: 'Reason for rejection' })
  @IsString()
  @MaxLength(2000)
  reason: string;
}

@InputType()
export class EditAndApproveTraitReviewInput {
  @Field(() => ID, { description: 'The ID of the review to edit and approve' })
  @IsUUID()
  reviewId: string;

  @Field(() => [CharacterTraitValueInput], { description: 'The corrected trait values to apply' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterTraitValueInput)
  correctedTraitValues: CharacterTraitValueInput[];
}

@InputType()
export class CreateTraitReviewInput {
  @Field(() => ID, { description: 'The ID of the character' })
  @IsUUID()
  characterId: string;

  @Field(() => TraitReviewSource, { description: 'The source of this review' })
  @IsEnum(TraitReviewSource)
  source: TraitReviewSource;

  @Field(() => [CharacterTraitValueInput], { description: 'The proposed trait values' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterTraitValueInput)
  proposedTraitValues: CharacterTraitValueInput[];

  @Field(() => [CharacterTraitValueInput], { nullable: true, description: 'The previous trait values (optional, will use current character values if not provided)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterTraitValueInput)
  previousTraitValues?: CharacterTraitValueInput[];
}
