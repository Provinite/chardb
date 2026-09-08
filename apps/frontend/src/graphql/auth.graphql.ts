import { gql } from "@apollo/client";

// The refresh token is no longer part of any payload: it arrives as an
// HttpOnly cookie on the same response and is never visible to script.

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
    }
  }
`;

// Returns a bare boolean, not a payload. Signup no longer produces a session:
// the account cannot be used until the address on it is confirmed.
export const SIGNUP_MUTATION = gql`
  mutation Signup($input: SignupInput!) {
    signup(input: $input)
  }
`;

/** Takes no argument: the server reads the refresh cookie off the request. */
export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken {
    refreshToken
  }
`;

/** Clears the refresh cookie. Only the server that set it can remove it. */
export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
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
        # An avatar IS this thumbnail, so re-framing it is re-framing the
        # avatar. Selected here so the profile editor's cropper opens on the
        # framing already chosen rather than back at the centre.
        thumbnailCrop {
          x
          y
          width
          height
        }
      }
      # Why the avatar is not showing, when one is set but unapproved. Owner-
      # only, and this query is only ever the owner.
      avatarImageModerationStatus
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
      # Everything the navigation, the switcher, the command palette and the
      # per-community permission hook need. They each used to ask
      # communityMembersByUser for this separately, which could not run until
      # the me query had told them their own id -- a round trip to learn
      # something the server never forgot.
      communityMemberships(first: 100) {
        nodes {
          id
          roleId
          userId
          role {
            id
            name
            communityId
            community {
              id
              name
              slug
            }
            canCreateSpecies
            canEditSpecies
            canCreateCharacter
            canEditCharacter
            canEditOwnCharacter
            canEditOwnCharacterRegistry
            canEditCharacterRegistry
            canCreateOrphanedCharacter
            canCreateInviteCode
            canListInviteCodes
            canCreateRole
            canEditRole
            canRemoveCommunityMember
            canManageMemberRoles
            canManageItems
            canGrantItems
            canModerateImages
            canDeleteCharacter
          }
        }
        totalCount
        hasNextPage
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
  useLogoutMutation,
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
  type LogoutMutation,
  type LogoutMutationVariables,
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
} from "../generated/graphql";
