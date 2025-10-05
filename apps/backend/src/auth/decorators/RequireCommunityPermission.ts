import { Reflector } from "@nestjs/core";
import { CommunityPermission } from "../CommunityPermission";

/**
 * Decorator to require a specific community role permission.
 *
 * This decorator marks a resolver as requiring a specific permission within a community.
 * It must be used together with:
 * - `@UseGuards(JwtAuthGuard, CommunityRoleGuard)` - To enforce authentication and permission checks
 * - {@link ResolveCommunityFrom} - To specify how to resolve the community context from arguments
 *
 * The permission check will verify that the current user has ANY role in the resolved
 * community that grants the specified permission. If a user has multiple roles, permissions
 * are OR'd together.
 *
 * @param permission - The community permission required to access this resolver
 *
 * @see {@link ResolveCommunityFrom} for specifying how to derive the community context
 * @see {@link CommunityPermission} for available community permissions
 *
 * @example
 * ```typescript
 * @Mutation(() => Species)
 * @UseGuards(JwtAuthGuard, CommunityRoleGuard)
 * @RequireCommunityPermission(CommunityPermission.CanEditSpecies)
 * @ResolveCommunityFrom({ speciesId: 'id' })
 * async updateSpecies(
 *   @Args('id') id: string,
 *   @Args('input') input: UpdateSpeciesInput
 * ) {
 *   // User is guaranteed to have canEditSpecies in the species' community
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Mutation(() => Character)
 * @UseGuards(JwtAuthGuard, CommunityRoleGuard)
 * @RequireCommunityPermission(CommunityPermission.CanCreateCharacter)
 * @ResolveCommunityFrom({ speciesId: 'input.speciesId' })
 * async createCharacter(@Args('input') input: CreateCharacterInput) {
 *   // User is guaranteed to have canCreateCharacter in the specified community
 * }
 * ```
 */
export const RequireCommunityPermission =
  Reflector.createDecorator<CommunityPermission>();
