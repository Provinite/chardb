import { Reflector } from '@nestjs/core';
import { CommunityResolutionConfig } from '../types/CommunityResolutionConfig';

/**
 * Metadata key for community resolution configuration
 */
export const COMMUNITY_RESOLUTION_KEY = 'communityResolution';

/**
 * Decorator to specify how to resolve the community context for permission checks.
 *
 * This decorator tells guards where to find entity IDs in the resolver arguments,
 * which can then be used to resolve the associated community.
 *
 * @param config - Mapping of entity types to argument paths
 *
 * @example
 * ```typescript
 * // Update mutation with ID as direct arg
 * @Mutation(() => Character)
 * @ResolveCommunityFrom({ characterId: 'id' })
 * async updateCharacter(@Args('id') id: string, @Args('input') input: UpdateCharacterInput) {
 *   // Guard will extract args.id and call communityResolver.getCharacterCommunity(id)
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Create mutation with ID in input object
 * @Mutation(() => Trait)
 * @ResolveCommunityFrom({ speciesId: 'input.speciesId' })
 * async createTrait(@Args('input') input: CreateTraitInput) {
 *   // Guard will extract args.input.speciesId and call communityResolver.getSpeciesCommunity(id)
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Direct community ID
 * @Mutation(() => Species)
 * @ResolveCommunityFrom({ communityId: 'input.communityId' })
 * async createSpecies(@Args('input') input: CreateSpeciesInput) {
 *   // Guard will extract args.input.communityId directly (no resolver call needed)
 * }
 * ```
 */
export const ResolveCommunityFrom =
  Reflector.createDecorator<CommunityResolutionConfig>();
