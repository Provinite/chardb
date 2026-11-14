// Stands in for apps/backend/src/auth/request-permissions.ts and for the
// GraphQL entities: the same property names, declared somewhere that is not a
// database model.

export interface RequestPermissions {
  readonly isAdmin: boolean;
  inCommunity(communityId: string): Promise<CommunityPermissions>;
}

export interface CommunityPermissions {
  hasMembership: boolean;
  canEditCharacter?: boolean;
}

export class UserEntity {
  isAdmin!: boolean;
  canListUsers!: boolean;
}
