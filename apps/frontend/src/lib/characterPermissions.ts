import type { GetCharacterQuery } from '../graphql/characters.graphql';
import type { MeQuery } from '../graphql/auth.graphql';

type Character = NonNullable<GetCharacterQuery['character']>;
type User = MeQuery['me'];

interface Permissions {
  canCreateOrphanedCharacter: boolean;
  canEditCharacter: boolean;
  canEditOwnCharacter: boolean;
}

/**
 * Determines if a user can edit a character.
 *
 * User can edit if:
 * 1. They own the character AND have canEditOwnCharacter permission, OR
 * 2. They have canEditCharacter permission (works for any character), OR
 * 3. Character is orphaned AND they have canCreateOrphanedCharacter permission
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

  const isOwner = character.owner && character.owner.id === user.id;
  const isOrphaned = !character.owner;

  // Character is orphaned
  if (isOrphaned) {
    return (
      permissions.canCreateOrphanedCharacter ||
      permissions.canEditCharacter
    );
  }

  // User has general edit permission (works for any character)
  if (permissions.canEditCharacter) {
    return true;
  }

  // User owns the character and has permission to edit own characters
  if (isOwner && permissions.canEditOwnCharacter) {
    return true;
  }

  return false;
}
