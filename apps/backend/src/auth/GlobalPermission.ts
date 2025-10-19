/**
 * Valid global permission names from the User entity
 */

export enum GlobalPermission {
  CanCreateCommunity = 'canCreateCommunity',
  CanListUsers = 'canListUsers',
  CanListInviteCodes = 'canListInviteCodes',
  CanCreateInviteCode = 'canCreateInviteCode',
  CanGrantGlobalPermissions = 'canGrantGlobalPermissions',
  IsAdmin = 'isAdmin',
}
