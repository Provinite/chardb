import { gql } from "@apollo/client";

/**
 * Both mutations are public and have to be. An account cannot sign in until its
 * address is confirmed, so nobody who needs either of these has a session.
 */

export const VERIFY_EMAIL_MUTATION = gql`
  mutation VerifyEmail($input: VerifyEmailInput!) {
    verifyEmail(input: $input)
  }
`;

/**
 * Always resolves true, whatever the address is. The server refuses silently
 * for an unknown address, an already-confirmed one, or one that has used up its
 * lifetime allowance -- so a caller cannot learn which of those happened, and
 * the UI must not claim more than "if that address needs confirming, it's on
 * its way".
 */
export const RESEND_VERIFICATION_EMAIL_MUTATION = gql`
  mutation ResendVerificationEmail($input: ResendVerificationEmailInput!) {
    resendVerificationEmail(input: $input)
  }
`;

// Re-export generated types and hooks after regeneration
export {
  // Hooks
  useVerifyEmailMutation,
  useResendVerificationEmailMutation,

  // Types
  type VerifyEmailMutation,
  type VerifyEmailMutationVariables,
  type ResendVerificationEmailMutation,
  type ResendVerificationEmailMutationVariables,
  type VerifyEmailInput,
  type ResendVerificationEmailInput,
} from "../generated/graphql";
