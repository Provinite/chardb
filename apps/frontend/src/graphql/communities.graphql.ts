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
  mutation UpdateCommunity($id: ID!, $updateCommunityInput: UpdateCommunityInput!) {
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

// Re-export generated types and hooks after regeneration
export {
  // Hooks
  useCommunitiesQuery,
  useCommunityByIdQuery,
  useCreateCommunityMutation,
  useUpdateCommunityMutation,
  useRemoveCommunityMutation,
  
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
  type Community,
  type CommunityConnection,
  type CreateCommunityInput,
  type UpdateCommunityInput,
} from '../generated/graphql';