/**
 * Community role permissions from the Role entity.
 * These permissions are checked within the context of a specific community.
 */
export enum CommunityPermission {
  /** Special sentinel value: user just needs ANY role in the community (membership check) */
  Any = "__ANY__",
  CanCreateSpecies = "canCreateSpecies",
  CanCreateCharacter = "canCreateCharacter",
  CanEditCharacter = "canEditCharacter",
  CanEditOwnCharacter = "canEditOwnCharacter",
  CanEditSpecies = "canEditSpecies",
  CanCreateInviteCode = "canCreateInviteCode",
  CanListInviteCodes = "canListInviteCodes",
  CanCreateRole = "canCreateRole",
  CanEditRole = "canEditRole",
  CanRemoveCommunityMember = "canRemoveCommunityMember",
  CanManageMemberRoles = "canManageMemberRoles",
}

export const AllCommunityPermissions = Object.values(CommunityPermission);
