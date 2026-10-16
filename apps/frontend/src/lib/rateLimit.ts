import { ApolloError } from "@apollo/client";
import type { GraphQLFormattedError } from "graphql";
import toast from "react-hot-toast";

/**
 * The `extensions.code` the backend puts on an operation refused by its rate
 * limiter. Must match `TOO_MANY_REQUESTS` in
 * `apps/backend/src/middleware/custom-throttler.guard.ts`.
 */
export const TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS";

export const RATE_LIMIT_MESSAGE =
  "Too many attempts. Wait a minute and try again.";

/**
 * Set as an operation's Apollo `context` when the screen shows the rate-limit
 * message itself, in place. The error link then stays quiet rather than
 * putting the same words in a toast as well.
 */
export const HANDLES_RATE_LIMIT = { handlesRateLimit: true } as const;

export function hasRateLimitError(
  errors: ReadonlyArray<GraphQLFormattedError> | undefined,
): boolean {
  return (
    errors?.some((error) => error.extensions?.code === TOO_MANY_REQUESTS) ??
    false
  );
}

export function isRateLimited(error: unknown): boolean {
  return error instanceof ApolloError && hasRateLimitError(error.graphQLErrors);
}

/**
 * One toast however many operations were refused at once: a page that fires
 * several queries can have all of them throttled together, and a stack of
 * identical toasts says nothing the first did not.
 */
export function notifyRateLimited(): void {
  toast.error(RATE_LIMIT_MESSAGE, { id: TOO_MANY_REQUESTS });
}
