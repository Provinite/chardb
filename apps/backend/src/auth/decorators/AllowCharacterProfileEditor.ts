import { Reflector } from "@nestjs/core";

export interface CharacterProfileEditConfig {
  /** Path to character ID in arguments (e.g., 'id', 'input.characterId') */
  characterId: string;
}

/**
 * Decorator to require character profile edit permissions based on ownership.
 *
 * This decorator is for profile-level operations: name, details, visibility,
 * tags, main media, deletion, etc.
 *
 * For registry field editing (registryId, variant, traits), use
 * @AllowCharacterRegistryEditor() instead.
 *
 * Permission logic:
 * - If user owns the character: requires `canEditOwnCharacter` or `canEditCharacter` permission
 * - If user does not own the character: requires `canEditCharacter` permission
 * - Permissions are resolved via character→species→community
 *
 * Example usage:
 * ```typescript
 * @AllowGlobalAdmin()
 * @AllowCharacterProfileEditor({ characterId: 'id' })
 * @Mutation(() => Character)
 * async updateCharacterProfile(@Args('id') id: string, ...) { ... }
 * ```
 */
export const AllowCharacterProfileEditor =
  Reflector.createDecorator<CharacterProfileEditConfig>();
