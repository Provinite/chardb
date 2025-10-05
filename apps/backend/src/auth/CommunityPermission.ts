/**
 * Community role permissions from the Role entity.
 * These permissions are checked within the context of a specific community.
 */
export enum CommunityPermission {
  CanCreateSpecies = "canCreateSpecies",
  CanCreateCharacter = "canCreateCharacter",
  CanEditCharacter = "canEditCharacter",
  CanEditOwnCharacter = "canEditOwnCharacter",
  CanEditSpecies = "canEditSpecies",
  CanCreateInviteCode = "canCreateInviteCode",
  CanListInviteCodes = "canListInviteCodes",
  CanCreateRole = "canCreateRole",
  CanEditRole = "canEditRole",
}

export const AllCommunityPermissions = Object.values(CommunityPermission);
