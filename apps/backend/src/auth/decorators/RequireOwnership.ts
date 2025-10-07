import { Reflector } from "@nestjs/core";
import { OwnershipResolutionConfig } from "../types/OwnershipResolutionConfig";

/**
 * Decorator to require that the current user owns the specified entity.
 *
 * This decorator marks a resolver as requiring entity ownership.
 * It must be used together with OwnershipGuard.
 *
 * Supported entity types:
 * - Character: verifies `character.ownerId === currentUser.id`
 * - Media: verifies `media.ownerId === currentUser.id`
 * - Gallery: verifies `gallery.ownerId === currentUser.id`
 *
 * @param config - Configuration specifying how to resolve the entity ID from arguments
 *
 * @example Character ownership
 * ```typescript
 * @Mutation(() => Character)
 * @RequireGlobalAdmin()  // Admin OR Owner (OrGuard)
 * @RequireOwnership({ characterId: 'id' })
 * async updateCharacter(
 *   @Args('id') id: string,
 *   @Args('input') input: UpdateCharacterInput
 * ) {
 *   // User is guaranteed to own this character OR be admin
 * }
 * ```
 *
 * @example Media ownership
 * ```typescript
 * @Mutation(() => Media)
 * @RequireGlobalAdmin()
 * @RequireOwnership({ mediaId: 'id' })
 * async updateMedia(@Args('id') id: string, @Args('input') input: UpdateMediaInput) {
 *   // User owns this media OR is admin
 * }
 * ```
 *
 * @example Nested path support
 * ```typescript
 * @Mutation(() => Character)
 * @RequireGlobalAdmin()
 * @RequireOwnership({ characterId: 'input.characterId' })
 * async addCharacterTags(@Args('input') input: AddCharacterTagsInput) {
 *   // Supports nested paths in input objects
 * }
 * ```
 */
export const RequireOwnership =
  Reflector.createDecorator<OwnershipResolutionConfig>();
