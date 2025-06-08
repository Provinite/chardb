// Re-export generated auth operations and types
export {
  // Mutations
  LoginDocument as LOGIN_MUTATION,
  SignupDocument as SIGNUP_MUTATION,
  RefreshTokenDocument as REFRESH_TOKEN_MUTATION,
  
  // Queries
  MeDocument as ME_QUERY,
  
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