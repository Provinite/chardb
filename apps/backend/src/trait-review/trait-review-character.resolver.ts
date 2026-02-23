import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { Character } from '../characters/entities/character.entity';
import { TraitReview } from './entities/trait-review.entity';
import { TraitReviewService } from './trait-review.service';
import { mapPrismaTraitReviewToGraphQL } from './utils/trait-review-mappers';

@Resolver(() => Character)
export class TraitReviewCharacterResolver {
  constructor(private readonly traitReviewService: TraitReviewService) {}

  @ResolveField(() => TraitReview, {
    nullable: true,
    description: 'The active pending trait review for this character',
  })
  async activeTraitReview(
    @Parent() character: Character,
  ): Promise<TraitReview | null> {
    const review = await this.traitReviewService.getActiveReviewForCharacter(character.id);
    if (!review) return null;
    return mapPrismaTraitReviewToGraphQL(review);
  }
}
