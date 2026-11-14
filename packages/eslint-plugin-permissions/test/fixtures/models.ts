// Stands in for the generated Prisma client: the rule is told that anything
// declared in this file is a database model.

export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  canListUsers: boolean;
}

export interface Role {
  id: string;
  communityId: string;
  canEditCharacter: boolean;
  canModerateImages: boolean;
}

export type RoleWhereInput = {
  communityId?: string;
  canEditCharacter?: boolean;
  communityMembers?: { some?: CommunityMemberWhereInput };
};

export type CommunityMemberWhereInput = {
  userId?: string;
  role?: RoleWhereInput;
};

export type CharacterWhereInput = {
  ownerId?: string;
  species?: { community?: { roles?: { some?: RoleWhereInput } } };
};

export type RoleCreateInput = {
  communityId: string;
  canEditCharacter?: boolean;
};

export type UserSelect = { id?: boolean; isAdmin?: boolean };

export declare function findCharacters(args: {
  where: CharacterWhereInput;
}): void;
export declare function findMembers(args: {
  where: CommunityMemberWhereInput;
}): void;
export declare function createRole(args: { data: RoleCreateInput }): void;
export declare function findUser(args: { select: UserSelect }): void;
