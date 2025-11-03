import type { GetCharacterQuery } from '../graphql/characters.graphql';
import type { MeQuery } from '../graphql/auth.graphql';

type Character = NonNullable<GetCharacterQuery['character']>;
type User = MeQuery['me'];

interface Permissions {
  canCreateOrphanedCharacter: boolean;
  canEditCharacter: boolean;
}

/**
 * Determines if a user can edit a character.
 *
 * User can edit if:
 * 1. They own the character, OR
 * 2. Character is orphaned AND they have canCreateOrphanedCharacter permission, OR
 * 3. Character is orphaned AND they have canEditCharacter permission
 *
 * @param character - The character to check
 * @param user - The current user (or null if not logged in)
 * @param permissions - Community permissions for the user
 * @returns true if user can edit the character
 */
export function canUserEditCharacter(
  character: Character | null | undefined,
  user: User | null | undefined,
  permissions: Permissions
): boolean {
  if (!character || !user) {
    return false;
  }

  // User owns the character
  if (character.owner && character.owner.id === user.id) {
    return true;
  }

  // Character is orphaned AND user has permissions
  if (!character.owner && (
    permissions.canCreateOrphanedCharacter ||
    permissions.canEditCharacter
  )) {
    return true;
  }

  return false;
}
