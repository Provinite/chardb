import type { GetCharacterQuery } from '../graphql/characters.graphql';
import type { MeQuery } from '../graphql/auth.graphql';

type Character = NonNullable<GetCharacterQuery['character']>;
type User = MeQuery['me'];

interface Permissions {
  canCreateOrphanedCharacter: boolean;
  canEditCharacter: boolean;
  canEditOwnCharacter: boolean;
  canEditOwnCharacterRegistry: boolean;
  canEditCharacterRegistry: boolean;
}

/**
 * Determines if a user can access the character edit page.
 *
 * User can access if they have ANY edit permission (profile or registry):
 * 1. They own the character AND have canEditOwnCharacter OR canEditOwnCharacterRegistry, OR
 * 2. They have canEditCharacter OR canEditCharacterRegistry (works for any character), OR
 * 3. Character is orphaned AND they have canCreateOrphanedCharacter permission
 *
 * Use canUserEditCharacterProfile() and canUserEditCharacterRegistry() to check
 * specific section permissions within the edit page.
 *
 * @param character - The character to check
 * @param user - The current user (or null if not logged in)
 * @param permissions - Community permissions for the user
 * @returns true if user can access the character edit page
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

  // User has general edit permission (profile or registry, works for any character)
  if (permissions.canEditCharacter || permissions.canEditCharacterRegistry) {
    return true;
  }

  // User owns the character and has any edit permission
  if (isOwner) {
    return !!(
      permissions.canEditOwnCharacter ||
      permissions.canEditOwnCharacterRegistry
    );
  }

  return false;
}

/**
 * Determines if a user can edit a character's profile fields.
 * Profile fields: name, details, visibility, tags, trading, ownership
 *
 * @param character - The character to check
 * @param user - The current user (or null if not logged in)
 * @param permissions - Community permissions for the user
 * @returns true if user can edit profile fields
 */
export function canUserEditCharacterProfile(
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

  // User has general profile edit permission
  if (permissions.canEditCharacter) {
    return true;
  }

  // User owns the character and has permission to edit own character profile
  if (isOwner && permissions.canEditOwnCharacter) {
    return true;
  }

  return false;
}

/**
 * Determines if a user can edit a character's registry fields.
 * Registry fields: registryId, traits
 * Requires character to have a species assigned.
 *
 * @param character - The character to check
 * @param user - The current user (or null if not logged in)
 * @param permissions - Community permissions for the user
 * @returns true if user can edit registry fields
 */
export function canUserEditCharacterRegistry(
  character: Character | null | undefined,
  user: User | null | undefined,
  permissions: Permissions
): boolean {
  if (!character || !user) {
    return false;
  }

  // Registry editing requires a species
  if (!character.species) {
    return false;
  }

  const isOwner = character.owner && character.owner.id === user.id;

  // User has general registry edit permission
  if (permissions.canEditCharacterRegistry) {
    return true;
  }

  // User owns the character and has permission to edit own character registry
  if (isOwner && permissions.canEditOwnCharacterRegistry) {
    return true;
  }

  return false;
}
