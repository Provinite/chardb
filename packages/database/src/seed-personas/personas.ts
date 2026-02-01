/**
 * User persona definitions for local testing
 */

export interface PersonaDefinition {
  username: string;
  email: string;
  displayName: string;
  password: string;
  /** Global permissions - only Site Admin has these */
  globalPermissions: {
    isAdmin: boolean;
    canCreateCommunity: boolean;
    canListUsers: boolean;
    canListInviteCodes: boolean;
    canCreateInviteCode: boolean;
    canGrantGlobalPermissions: boolean;
  };
  /** Role name to assign in the test community */
  roleName: string;
  /** If true, this persona's role is a custom role that needs to be created */
  isCustomRole: boolean;
  /** Custom role permissions (only used if isCustomRole is true) */
  customRolePermissions?: {
    canCreateCharacter: boolean;
    canEditOwnCharacter: boolean;
    canEditOwnCharacterRegistry: boolean;
    canUploadOwnCharacterImages: boolean;
  };
}

export const TEST_PASSWORD = "test123";
export const TEST_COMMUNITY_NAME = "Test Community";

export const PERSONAS: Record<string, PersonaDefinition> = {
  siteAdmin: {
    username: "siteadmin",
    email: "siteadmin@test.local",
    displayName: "Site Admin",
    password: TEST_PASSWORD,
    globalPermissions: {
      isAdmin: true,
      canCreateCommunity: true,
      canListUsers: true,
      canListInviteCodes: true,
      canCreateInviteCode: true,
      canGrantGlobalPermissions: true,
    },
    roleName: "Admin",
    isCustomRole: false,
  },
  communityAdmin: {
    username: "communityadmin",
    email: "communityadmin@test.local",
    displayName: "Community Admin",
    password: TEST_PASSWORD,
    globalPermissions: {
      isAdmin: false,
      canCreateCommunity: false,
      canListUsers: false,
      canListInviteCodes: false,
      canCreateInviteCode: false,
      canGrantGlobalPermissions: false,
    },
    roleName: "Admin",
    isCustomRole: false,
  },
  moderator: {
    username: "moderator",
    email: "moderator@test.local",
    displayName: "Moderator",
    password: TEST_PASSWORD,
    globalPermissions: {
      isAdmin: false,
      canCreateCommunity: false,
      canListUsers: false,
      canListInviteCodes: false,
      canCreateInviteCode: false,
      canGrantGlobalPermissions: false,
    },
    roleName: "Moderator",
    isCustomRole: false,
  },
  member: {
    username: "member",
    email: "member@test.local",
    displayName: "Member",
    password: TEST_PASSWORD,
    globalPermissions: {
      isAdmin: false,
      canCreateCommunity: false,
      canListUsers: false,
      canListInviteCodes: false,
      canCreateInviteCode: false,
      canGrantGlobalPermissions: false,
    },
    roleName: "Member",
    isCustomRole: false,
  },
  memberRegistry: {
    username: "member-registry",
    email: "member-registry@test.local",
    displayName: "Member (Registry Edit)",
    password: TEST_PASSWORD,
    globalPermissions: {
      isAdmin: false,
      canCreateCommunity: false,
      canListUsers: false,
      canListInviteCodes: false,
      canCreateInviteCode: false,
      canGrantGlobalPermissions: false,
    },
    roleName: "Member (Registry Edit)",
    isCustomRole: true,
    customRolePermissions: {
      canCreateCharacter: true,
      canEditOwnCharacter: true,
      canEditOwnCharacterRegistry: true,
      canUploadOwnCharacterImages: true,
    },
  },
  memberNoRegistry: {
    username: "member-noregistry",
    email: "member-noregistry@test.local",
    displayName: "Member (No Registry)",
    password: TEST_PASSWORD,
    globalPermissions: {
      isAdmin: false,
      canCreateCommunity: false,
      canListUsers: false,
      canListInviteCodes: false,
      canCreateInviteCode: false,
      canGrantGlobalPermissions: false,
    },
    roleName: "Member (No Registry)",
    isCustomRole: true,
    customRolePermissions: {
      canCreateCharacter: true,
      canEditOwnCharacter: true,
      canEditOwnCharacterRegistry: false,
      canUploadOwnCharacterImages: true,
    },
  },
};

export const PERSONA_LIST = Object.values(PERSONAS);
