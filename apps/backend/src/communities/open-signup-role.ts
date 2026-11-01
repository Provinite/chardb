/**
 * The permissions a role given out by open sign-up may carry: over a member's
 * own characters and nothing else. Anyone can join with it, unreviewed, so
 * anything over other people or the community itself is staff work.
 *
 * An allowlist, so a permission added later is refused until somebody decides
 * otherwise.
 */
const OPEN_SIGNUP_PERMISSIONS: ReadonlySet<string> = new Set([
  "canCreateCharacter",
  "canEditOwnCharacter",
  "canEditOwnCharacterRegistry",
  "canUploadOwnCharacterImages",
]);

/**
 * True when `role` grants any `can*` permission outside the allowlist. Takes
 * the database row or the GraphQL entity alike: both carry every permission.
 */
export function hasStaffPermissions(role: object): boolean {
  return Object.entries(role).some(
    ([key, value]) =>
      key.startsWith("can") &&
      value === true &&
      !OPEN_SIGNUP_PERMISSIONS.has(key),
  );
}
