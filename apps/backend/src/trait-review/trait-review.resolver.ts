import { Resolver, Query, Mutation, Args, Int, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TraitReviewService } from './trait-review.service';
import {
  TraitReview,
  TraitReviewQueueConnection,
} from './entities/trait-review.entity';
import {
  TraitReviewQueueFiltersInput,
  ApproveTraitReviewInput,
  RejectTraitReviewInput,
  EditAndApproveTraitReviewInput,
  CreateTraitReviewInput,
} from './dto/trait-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/CurrentUser';
import { AuthenticatedCurrentUserType } from '../auth/types/current-user.type';
import { AllowGlobalAdmin } from '../auth/decorators/AllowGlobalAdmin';
import { AllowCommunityPermission } from '../auth/decorators/AllowCommunityPermission';
import { CommunityPermission } from '../auth/CommunityPermission';
import { ResolveCommunityFrom } from '../auth/decorators/ResolveCommunityFrom';
import { AllowAnyAuthenticated } from '../auth/decorators/AllowAnyAuthenticated';
import {
  mapPrismaTraitReviewToGraphQL,
  mapTraitReviewQueueResultToGraphQL,
} from './utils/trait-review-mappers';

@Resolver()
export class TraitReviewResolver {
  constructor(
    private readonly traitReviewService: TraitReviewService,
  ) {}

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanEditCharacterRegistry)
  @ResolveCommunityFrom({ communityId: 'communityId' })
  @UseGuards(JwtAuthGuard)
  @Query(() => TraitReviewQueueConnection, {
    description: 'Get trait reviews for a community moderation queue',
  })
  async traitReviewQueue(
    @Args('communityId', { type: () => ID }) communityId: string,
    @Args('filters', { nullable: true }) filters: TraitReviewQueueFiltersInput,
    @Args('first', { nullable: true, defaultValue: 20, type: () => Int }) first: number,
    @Args('offset', { nullable: true, defaultValue: 0, type: () => Int }) offset: number,
  ): Promise<TraitReviewQueueConnection> {
    const result = await this.traitReviewService.getQueueForCommunity(communityId, filters, first, offset);
    return mapTraitReviewQueueResultToGraphQL(result);
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanEditCharacterRegistry)
  @ResolveCommunityFrom({ communityId: 'communityId' })
  @UseGuards(JwtAuthGuard)
  @Query(() => Int, {
    description: 'Get count of pending trait reviews for a community',
  })
  async pendingTraitReviewCount(
    @Args('communityId', { type: () => ID }) communityId: string,
  ): Promise<number> {
    return this.traitReviewService.getPendingCountForCommunity(communityId);
  }

  @AllowAnyAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Query(() => TraitReview, {
    nullable: true,
    description: 'Get the active pending trait review for a character',
  })
  async characterTraitReview(
    @Args('characterId', { type: () => ID }) characterId: string,
  ): Promise<TraitReview | null> {
    const review = await this.traitReviewService.getActiveReviewForCharacter(characterId);
    if (!review) return null;
    return mapPrismaTraitReviewToGraphQL(review);
  }

  @AllowAnyAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Mutation(() => TraitReview, {
    description: 'Approve a trait review (moderator action)',
  })
  async approveTraitReview(
    @Args('input') input: ApproveTraitReviewInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<TraitReview> {
    const review = await this.traitReviewService.approveReview(input.reviewId, user.id);
    return mapPrismaTraitReviewToGraphQL(review);
  }

  @AllowAnyAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Mutation(() => TraitReview, {
    description: 'Reject a trait review (moderator action)',
  })
  async rejectTraitReview(
    @Args('input') input: RejectTraitReviewInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<TraitReview> {
    const review = await this.traitReviewService.rejectReview(
      input.reviewId,
      user.id,
      input.reason,
    );
    return mapPrismaTraitReviewToGraphQL(review);
  }

  @AllowAnyAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Mutation(() => TraitReview, {
    description: 'Edit and approve a trait review (moderator action)',
  })
  async editAndApproveTraitReview(
    @Args('input') input: EditAndApproveTraitReviewInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<TraitReview> {
    const correctedValues = input.correctedTraitValues
      .filter((tv) => tv.value !== undefined && tv.value !== null)
      .map((tv) => ({
        traitId: tv.traitId,
        value: tv.value!,
      }));

    const review = await this.traitReviewService.editAndApproveReview(
      input.reviewId,
      user.id,
      correctedValues,
    );
    return mapPrismaTraitReviewToGraphQL(review);
  }

  @AllowAnyAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Mutation(() => TraitReview, {
    description: 'Create a trait review for a character',
  })
  async createTraitReview(
    @Args('input') input: CreateTraitReviewInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<TraitReview> {
    const proposedValues = input.proposedTraitValues
      .filter((tv) => tv.value !== undefined && tv.value !== null)
      .map((tv) => ({
        traitId: tv.traitId,
        value: tv.value!,
      }));

    const previousValues = input.previousTraitValues
      ? input.previousTraitValues
          .filter((tv) => tv.value !== undefined && tv.value !== null)
          .map((tv) => ({
            traitId: tv.traitId,
            value: tv.value!,
          }))
      : [];

    const review = await this.traitReviewService.createReview(
      input.characterId,
      input.source,
      proposedValues,
      previousValues,
    );
    return mapPrismaTraitReviewToGraphQL(review);
  }
}
