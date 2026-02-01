import { Reflector } from "@nestjs/core";

export interface CharacterRegistryEditConfig {
  /** Path to character ID in arguments (e.g., 'id', 'input.characterId') */
  characterId: string;
}

/**
 * Decorator to require character registry edit permissions based on ownership.
 *
 * This decorator is for registry-level operations: registryId, variant, traits.
 *
 * For profile field editing (name, details, visibility, tags, main media, deletion),
 * use @AllowCharacterProfileEditor() instead.
 *
 * Permission logic:
 * - If user owns the character: requires `canEditOwnCharacterRegistry` or `canEditCharacterRegistry` permission
 * - If user does not own the character: requires `canEditCharacterRegistry` permission
 * - Permissions are resolved via character→species→community
 *
 * Example usage:
 * ```typescript
 * @AllowGlobalAdmin()
 * @AllowCharacterRegistryEditor({ characterId: 'id' })
 * @Mutation(() => Character)
 * async updateCharacterRegistry(@Args('id') id: string, ...) { ... }
 * ```
 */
export const AllowCharacterRegistryEditor =
  Reflector.createDecorator<CharacterRegistryEditConfig>();
