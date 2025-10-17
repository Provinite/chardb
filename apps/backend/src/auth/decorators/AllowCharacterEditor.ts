import { Reflector } from "@nestjs/core";

export interface CharacterEditConfig {
  /** Path to character ID in arguments (e.g., 'id', 'input.characterId') */
  characterId: string;
}

/**
 * Decorator to require character edit permissions based on ownership.
 *
 * Permission logic:
 * - If user owns the character: requires `canEditOwnCharacter` permission
 * - If user does not own the character: requires `canEditCharacter` permission
 * - Permissions are resolved via character→species→community
 *
 * Example usage:
 * ```typescript
 * @AllowGlobalAdmin()
 * @AllowCharacterEditor({ characterId: 'id' })
 * @Mutation(() => Character)
 * async updateCharacter(@Args('id') id: string, ...) { ... }
 * ```
 */
export const AllowCharacterEditor =
  Reflector.createDecorator<CharacterEditConfig>();
