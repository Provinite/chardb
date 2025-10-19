import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user {
        id
        username
        email
        displayName
        avatarUrl
        isAdmin
        isVerified
        createdAt
      }
    }
  }
`;

export const SIGNUP_MUTATION = gql`
  mutation Signup($input: SignupInput!) {
    signup(input: $input) {
      accessToken
      refreshToken
      user {
        id
        username
        email
        displayName
        avatarUrl
        isAdmin
        isVerified
        createdAt
      }
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($token: String!) {
    refreshToken(token: $token)
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      email
      displayName
      bio
      avatarUrl
      location
      website
      dateOfBirth
      isVerified
      isAdmin
      canCreateInviteCode
      canListInviteCodes
      canCreateCommunity
      canGrantGlobalPermissions
      canListUsers
      privacySettings
      createdAt
      updatedAt
    }
  }
`;

// Re-export generated types and hooks after regeneration
export {
  // Hooks
  useLoginMutation,
  useSignupMutation,
  useRefreshTokenMutation,
  useMeQuery,

  // Types
  type LoginMutation,
  type LoginMutationVariables,
  type SignupMutation,
  type SignupMutationVariables,
  type RefreshTokenMutation,
  type RefreshTokenMutationVariables,
  type MeQuery,
  type MeQueryVariables,
  type User,
  type AuthPayload,
  type LoginInput,
  type SignupInput,
} from '../generated/graphql';
