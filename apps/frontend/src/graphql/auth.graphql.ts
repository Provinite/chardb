import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
    }
  }
`;

export const SIGNUP_MUTATION = gql`
  mutation Signup($input: SignupInput!) {
    signup(input: $input) {
      accessToken
      refreshToken
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($token: String!) {
    refreshToken(token: $token)
  }
`;

export const FORGOT_PASSWORD_MUTATION = gql`
  mutation ForgotPassword($input: ForgotPasswordInput!) {
    forgotPassword(input: $input)
  }
`;

export const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input)
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
      avatarImage {
        id
        originalUrl
        thumbnailUrl
        altText
      }
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
      communityMemberships {
        id
        roleId
        userId
        role {
          id
          name
          communityId
          canCreateCharacter
          canEditCharacter
          canCreateOrphanedCharacter
        }
      }
    }
  }
`;

// Re-export generated types and hooks after regeneration
export {
  // Hooks
  useLoginMutation,
  useSignupMutation,
  useRefreshTokenMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useMeQuery,

  // Types
  type LoginMutation,
  type LoginMutationVariables,
  type SignupMutation,
  type SignupMutationVariables,
  type RefreshTokenMutation,
  type RefreshTokenMutationVariables,
  type ForgotPasswordMutation,
  type ForgotPasswordMutationVariables,
  type ResetPasswordMutation,
  type ResetPasswordMutationVariables,
  type MeQuery,
  type MeQueryVariables,
  type User,
  type AuthPayload,
  type LoginInput,
  type SignupInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from '../generated/graphql';