import { GraphQLError } from "graphql";

/**
 * The `extensions.code` on a sign-in refused for want of a confirmed address.
 *
 * A code rather than a message match: the login screen has to tell this apart
 * from bad credentials to offer a resend instead of "try again", and matching
 * on prose means the offer silently disappears the day somebody rewords it.
 */
export const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED";

/**
 * Thrown wherever a session would otherwise be minted for an account whose
 * address has never been confirmed -- login and refresh both, so an old refresh
 * cookie cannot be used to walk around the check.
 */
export class EmailNotVerifiedError extends GraphQLError {
  constructor() {
    super("Confirm your email address before signing in.", {
      extensions: { code: EMAIL_NOT_VERIFIED },
    });
  }
}
