import { gql } from '@apollo/client';

export const COMMUNITIES_QUERY = gql`
  query Communities($first: Int, $after: String) {
    communities(first: $first, after: $after) {
      nodes {
        id
        name
        createdAt
        updatedAt
      }
      hasNextPage
      hasPreviousPage
      totalCount
    }
  }
`;

export const COMMUNITY_BY_ID_QUERY = gql`
  query CommunityById($id: ID!) {
    community(id: $id) {
      id
      name
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_COMMUNITY_MUTATION = gql`
  mutation CreateCommunity($createCommunityInput: CreateCommunityInput!) {
    createCommunity(createCommunityInput: $createCommunityInput) {
      id
      name
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_COMMUNITY_MUTATION = gql`
  mutation UpdateCommunity(
    $id: ID!
    $updateCommunityInput: UpdateCommunityInput!
  ) {
    updateCommunity(id: $id, updateCommunityInput: $updateCommunityInput) {
      id
      name
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_COMMUNITY_MUTATION = gql`
  mutation RemoveCommunity($id: ID!) {
    removeCommunity(id: $id) {
      removed
      message
    }
  }
`;

export const COMMUNITY_MEMBERS_BY_USER_QUERY = gql`
  query CommunityMembersByUser($userId: ID!, $first: Int, $after: String) {
    communityMembersByUser(userId: $userId, first: $first, after: $after) {
      nodes {
        id
        createdAt
        updatedAt
        role {
          id
          name
          community {
            id
            name
            createdAt
            updatedAt
          }
          canCreateCharacter
          canCreateInviteCode
          canCreateRole
          canEditCharacter
          canCreateSpecies
          canEditSpecies
          canEditRole
          canEditCharacter
          canEditOwnCharacter
          canListInviteCodes
          canRemoveCommunityMember
          canManageMemberRoles
        }
        user {
          id
          username
          displayName
        }
      }
      hasNextPage
      hasPreviousPage
      totalCount
    }
  }
`;

// Re-export generated types and hooks after regeneration
export {
  // Hooks
  useCommunitiesQuery,
  useCommunityByIdQuery,
  useCreateCommunityMutation,
  useUpdateCommunityMutation,
  useRemoveCommunityMutation,
  useCommunityMembersByUserQuery,

  // Types
  type CommunitiesQuery,
  type CommunitiesQueryVariables,
  type CommunityByIdQuery,
  type CommunityByIdQueryVariables,
  type CreateCommunityMutation,
  type CreateCommunityMutationVariables,
  type UpdateCommunityMutation,
  type UpdateCommunityMutationVariables,
  type RemoveCommunityMutation,
  type RemoveCommunityMutationVariables,
  type CommunityMembersByUserQuery,
  type CommunityMembersByUserQueryVariables,
  type Community,
  type CommunityConnection,
  type CommunityMember,
  type CommunityMemberConnection,
  type CreateCommunityInput,
  type UpdateCommunityInput,
} from '../generated/graphql';
