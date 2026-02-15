import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { ModerationStatus, TraitReviewSource } from '@prisma/client';
import { Character } from '../../characters/entities/character.entity';
import { User } from '../../users/entities/user.entity';
import { CharacterTraitValue } from '../../shared/types/character-trait.types';

@ObjectType({ description: 'A trait review for a character' })
export class TraitReview {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  characterId: string;

  @Field(() => ModerationStatus)
  status: ModerationStatus;

  @Field(() => TraitReviewSource)
  source: TraitReviewSource;

  @Field(() => [CharacterTraitValue], { description: 'The proposed trait values' })
  proposedTraitValues: CharacterTraitValue[];

  @Field(() => [CharacterTraitValue], { description: 'The previous trait values' })
  previousTraitValues: CharacterTraitValue[];

  @Field(() => [CharacterTraitValue], { nullable: true, description: 'The trait values actually applied (if edited)' })
  appliedTraitValues?: CharacterTraitValue[];

  @Field({ nullable: true, description: 'When the review was resolved' })
  resolvedAt?: Date;

  @Field(() => ID, { nullable: true })
  resolvedById?: string;

  @Field({ nullable: true, description: 'Reason for rejection' })
  rejectionReason?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations resolved by field resolvers
  @Field(() => Character, { description: 'The character being reviewed' })
  character: Character;

  @Field(() => User, { nullable: true, description: 'The moderator who resolved this review' })
  resolvedBy?: User;
}

@ObjectType({ description: 'An item in the trait review queue' })
export class TraitReviewQueueItem {
  @Field(() => TraitReview)
  review: TraitReview;

  @Field({ description: 'Name of the character' })
  characterName: string;

  @Field(() => ID, { description: 'ID of the character' })
  characterId: string;

  @Field({ nullable: true, description: 'Registry ID of the character' })
  registryId?: string;

  @Field({ nullable: true, description: 'Name of the species' })
  speciesName?: string;

  @Field({ nullable: true, description: 'Name of the species variant' })
  variantName?: string;
}

@ObjectType({ description: 'Paginated list of trait reviews in the queue' })
export class TraitReviewQueueConnection {
  @Field(() => [TraitReviewQueueItem])
  items: TraitReviewQueueItem[];

  @Field(() => Int, { description: 'Total count of pending reviews' })
  total: number;

  @Field({ description: 'Whether there are more reviews after this page' })
  hasMore: boolean;
}
