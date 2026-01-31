import { gql } from '@apollo/client';

export const ROLES_BY_COMMUNITY = gql`
  query RolesByCommunityDetailed($communityId: ID!, $first: Int!, $after: String) {
    rolesByCommunity(communityId: $communityId, first: $first, after: $after) {
      nodes {
        id
        name
        communityId
        canCreateSpecies
        canCreateCharacter
        canCreateOrphanedCharacter
        canEditCharacter
        canEditOwnCharacter
        canEditOwnCharacterRegistry
        canEditCharacterRegistry
        canEditSpecies
        canManageItems
        canGrantItems
        canUploadOwnCharacterImages
        canUploadCharacterImages
        canCreateInviteCode
        canListInviteCodes
        canCreateRole
        canEditRole
        canRemoveCommunityMember
        canManageMemberRoles
        createdAt
        updatedAt
        community {
          id
          name
        }
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
`;

export const CREATE_ROLE = gql`
  mutation CreateRole($input: CreateRoleInput!) {
    createRole(createRoleInput: $input) {
      id
      name
      communityId
      canCreateSpecies
      canCreateCharacter
      canCreateOrphanedCharacter
      canEditCharacter
      canEditOwnCharacter
      canEditSpecies
      canManageItems
      canGrantItems
      canUploadOwnCharacterImages
      canUploadCharacterImages
      canCreateInviteCode
      canListInviteCodes
      canCreateRole
      canEditRole
      canRemoveCommunityMember
      canManageMemberRoles
      createdAt
      updatedAt
      community {
        id
        name
      }
    }
  }
`;

export const UPDATE_ROLE = gql`
  mutation UpdateRole($id: ID!, $input: UpdateRoleInput!) {
    updateRole(id: $id, updateRoleInput: $input) {
      id
      name
      communityId
      canCreateSpecies
      canCreateCharacter
      canCreateOrphanedCharacter
      canEditCharacter
      canEditOwnCharacter
      canEditSpecies
      canManageItems
      canGrantItems
      canUploadOwnCharacterImages
      canUploadCharacterImages
      canCreateInviteCode
      canListInviteCodes
      canCreateRole
      canEditRole
      canRemoveCommunityMember
      canManageMemberRoles
      createdAt
      updatedAt
      community {
        id
        name
      }
    }
  }
`;

export const COMMUNITY_MEMBERS_WITH_ROLES = gql`
  query CommunityMembersWithRoles($communityId: ID!, $first: Int!, $after: String) {
    communityMembersByCommunity(communityId: $communityId, first: $first, after: $after) {
      nodes {
        id
        userId
        roleId
        createdAt
        updatedAt
        user {
          id
          username
          email
          displayName
        }
        role {
          id
          name
          canCreateSpecies
          canCreateCharacter
          canCreateOrphanedCharacter
          canEditCharacter
          canEditOwnCharacter
          canEditOwnCharacterRegistry
          canEditCharacterRegistry
          canEditSpecies
          canManageItems
          canGrantItems
          canUploadOwnCharacterImages
          canUploadCharacterImages
          canCreateInviteCode
          canListInviteCodes
          canCreateRole
          canEditRole
          canRemoveCommunityMember
          canManageMemberRoles
        }
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
`;

export const UPDATE_COMMUNITY_MEMBER = gql`
  mutation UpdateCommunityMember($id: ID!, $input: UpdateCommunityMemberInput!) {
    updateCommunityMember(id: $id, updateCommunityMemberInput: $input) {
      id
      userId
      roleId
      createdAt
      updatedAt
      user {
        id
        username
        email
        displayName
      }
      role {
        id
        name
        canCreateSpecies
        canCreateCharacter
        canCreateOrphanedCharacter
        canEditCharacter
        canEditOwnCharacter
        canEditOwnCharacterRegistry
        canEditCharacterRegistry
        canEditSpecies
        canManageItems
        canGrantItems
        canUploadOwnCharacterImages
        canUploadCharacterImages
        canCreateInviteCode
        canListInviteCodes
        canCreateRole
        canEditRole
        canRemoveCommunityMember
        canManageMemberRoles
      }
    }
  }
`;