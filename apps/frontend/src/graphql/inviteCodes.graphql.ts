import { gql } from '@apollo/client';

export const INVITE_CODES_QUERY = gql`
  query InviteCodes($first: Int, $after: String, $communityId: ID) {
    inviteCodes(first: $first, after: $after, communityId: $communityId) {
      nodes {
        id
        claimCount
        maxClaims
        isAvailable
        remainingClaims
        createdAt
        updatedAt
        creator {
          id
          username
          displayName
        }
        role {
          id
          name
          community {
            id
            name
          }
        }
      }
      hasNextPage
      hasPreviousPage
      totalCount
    }
  }
`;

export const INVITE_CODE_BY_ID_QUERY = gql`
  query InviteCodeById($id: ID!) {
    inviteCodeById(id: $id) {
      id
      claimCount
      maxClaims
      isAvailable
      remainingClaims
      createdAt
      updatedAt
      creator {
        id
        username
        displayName
      }
      role {
        id
        name
        community {
          id
          name
        }
      }
    }
  }
`;

export const CREATE_INVITE_CODE_MUTATION = gql`
  mutation CreateInviteCode($createInviteCodeInput: CreateInviteCodeInput!) {
    createInviteCode(createInviteCodeInput: $createInviteCodeInput) {
      id
      claimCount
      maxClaims
      isAvailable
      remainingClaims
      createdAt
      updatedAt
      creator {
        id
        username
        displayName
      }
      role {
        id
        name
        community {
          id
          name
        }
      }
    }
  }
`;

export const UPDATE_INVITE_CODE_MUTATION = gql`
  mutation UpdateInviteCode(
    $id: ID!
    $updateInviteCodeInput: UpdateInviteCodeInput!
  ) {
    updateInviteCode(id: $id, updateInviteCodeInput: $updateInviteCodeInput) {
      id
      claimCount
      maxClaims
      isAvailable
      remainingClaims
      createdAt
      updatedAt
      creator {
        id
        username
        displayName
      }
      role {
        id
        name
        community {
          id
          name
        }
      }
    }
  }
`;

export const REMOVE_INVITE_CODE_MUTATION = gql`
  mutation RemoveInviteCode($id: ID!) {
    removeInviteCode(id: $id) {
      removed
      message
    }
  }
`;

export const CLAIM_INVITE_CODE_MUTATION = gql`
  mutation ClaimInviteCode(
    $id: ID!
    $claimInviteCodeInput: ClaimInviteCodeInput!
  ) {
    claimInviteCode(id: $id, claimInviteCodeInput: $claimInviteCodeInput) {
      id
      claimCount
      maxClaims
      isAvailable
      remainingClaims
      creator {
        id
        username
        displayName
      }
      role {
        id
        name
        community {
          id
          name
        }
      }
    }
  }
`;

export const ROLES_BY_COMMUNITY_QUERY = gql`
  query RolesByCommunity($communityId: ID!, $first: Int, $after: String) {
    rolesByCommunity(communityId: $communityId, first: $first, after: $after) {
      nodes {
        id
        name
        canCreateInviteCode
        community {
          id
          name
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
  useInviteCodesQuery,
  useInviteCodeByIdQuery,
  useCreateInviteCodeMutation,
  useUpdateInviteCodeMutation,
  useRemoveInviteCodeMutation,
  useClaimInviteCodeMutation,
  useRolesByCommunityQuery,

  // Types
  type InviteCodesQuery,
  type InviteCodesQueryVariables,
  type InviteCodeByIdQuery,
  type InviteCodeByIdQueryVariables,
  type CreateInviteCodeMutation,
  type CreateInviteCodeMutationVariables,
  type UpdateInviteCodeMutation,
  type UpdateInviteCodeMutationVariables,
  type RemoveInviteCodeMutation,
  type RemoveInviteCodeMutationVariables,
  type ClaimInviteCodeMutation,
  type ClaimInviteCodeMutationVariables,
  type RolesByCommunityQuery,
  type RolesByCommunityQueryVariables,
  type InviteCode,
  type InviteCodeConnection,
  type Role,
  type RoleConnection,
  type CreateInviteCodeInput,
  type UpdateInviteCodeInput,
  type ClaimInviteCodeInput,
} from '../generated/graphql';
