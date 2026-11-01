import type { Role } from "@chardb/database";

/** Every permission column on `Role`. */
export type RolePermission = Extract<keyof Role, `can${string}`>;

/**
 * Which role permissions open sign-up may hand out.
 *
 * READ THIS WHEN ADDING A ROLE PERMISSION. A community with open sign-up gives
 * its chosen role to anyone who joins, with no one reviewing them. That role
 * may only carry `member` permissions: power over the joiner's own things.
 * Anything over other people's things, other members, or the community itself
 * is `staff`, and a role holding it can neither be chosen for open sign-up nor
 * be given it while chosen.
 *
 * Every permission column must appear here; a new one fails type-check until
 * it is classified. When unsure, choose `staff`. Marking a permission `member`
 * means strangers get it the moment they sign up.
 */
export const OPEN_SIGNUP_PERMISSIONS = {
  canCreateCharacter: "member",
  canEditOwnCharacter: "member",
  canEditOwnCharacterRegistry: "member",
  canUploadOwnCharacterImages: "member",

  canCreateOrphanedCharacter: "staff",
  canCreateSpecies: "staff",
  canEditSpecies: "staff",
  canEditCharacter: "staff",
  canEditCharacterRegistry: "staff",
  canDeleteCharacter: "staff",
  canUploadCharacterImages: "staff",
  canModerateImages: "staff",
  canCreateInviteCode: "staff",
  canListInviteCodes: "staff",
  canCreateRole: "staff",
  canEditRole: "staff",
  canRemoveCommunityMember: "staff",
  canManageMemberRoles: "staff",
  canManageItems: "staff",
  canGrantItems: "staff",
} as const satisfies Record<RolePermission, "member" | "staff">;

const STAFF_PERMISSIONS = (
  Object.keys(OPEN_SIGNUP_PERMISSIONS) as RolePermission[]
).filter((key) => OPEN_SIGNUP_PERMISSIONS[key] === "staff");

/**
 * True when `role` holds any `staff` permission. Takes the database row or the
 * GraphQL entity alike: both carry every permission.
 */
export function hasStaffPermissions(
  role: Readonly<Record<RolePermission, boolean>>,
): boolean {
  return STAFF_PERMISSIONS.some((key) => role[key]);
}
