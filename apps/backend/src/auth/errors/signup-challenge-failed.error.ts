import { GraphQLError } from "graphql";

/**
 * The `extensions.code` on a sign-up refused by the challenge or honeypot.
 * The form resets its challenge on this code and asks for another try.
 */
export const SIGNUP_CHALLENGE_FAILED = "SIGNUP_CHALLENGE_FAILED";

/** Why a sign-up challenge was refused. Logged, never sent to the client. */
export type SignupChallengeFailure =
  | "malformed"
  | "expired"
  | "invalid"
  | "spent"
  | "honeypot";

/**
 * Thrown before any account is created when the sign-up's proof of work is
 * missing, malformed, expired, forged, already spent, or the honeypot field
 * was filled in. One message for every reason, so a script learns nothing
 * about which check it failed.
 */
export class SignupChallengeFailedError extends GraphQLError {
  constructor(readonly reason: SignupChallengeFailure) {
    super("Verification failed. Please try again.", {
      extensions: { code: SIGNUP_CHALLENGE_FAILED },
    });
  }
}
