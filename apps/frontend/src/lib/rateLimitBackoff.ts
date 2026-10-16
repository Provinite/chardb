import { ApolloLink, Observable, type FetchResult } from "@apollo/client";
import { GraphQLError } from "graphql";
import {
  hasRateLimitError,
  RATE_LIMIT_MESSAGE,
  TOO_MANY_REQUESTS,
} from "./rateLimit";

/**
 * How long every outbound operation is held back after the server refuses one,
 * by how many refusals in a row there have been. The last step repeats.
 */
export const BACKOFF_STEPS_MS = [5_000, 7_000, 15_000] as const;

/**
 * Stops the client sending anything for a while once the server has said it is
 * going too fast, rather than letting every pending query and retry spend the
 * limit again.
 *
 * Only reacts to refusals; it does not count requests or know the server's
 * limits, which are per resolver and can change without the client knowing.
 *
 * - A refusal starts a block of the current step's length and moves to the
 *   next step. Refusals that arrive while a block is already running (a page's
 *   queries throttled together) do not escalate it again.
 * - While blocked, operations are answered locally with the same
 *   `TOO_MANY_REQUESTS` error the server sends, so the error link shows its
 *   usual toast and screens handle it as they already do.
 * - A successful response after the block has ended returns to the first step.
 *
 * State lives in memory: a reload starts over, and the server still enforces.
 */
export function createRateLimitBackoff(now: () => number = Date.now) {
  let step = 0;
  let blockedUntil = 0;

  const isBlocked = () => now() < blockedUntil;

  const refused = () => {
    if (isBlocked()) return;
    const index = Math.min(step, BACKOFF_STEPS_MS.length - 1);
    blockedUntil = now() + BACKOFF_STEPS_MS[index];
    step += 1;
  };

  const succeeded = () => {
    if (!isBlocked()) step = 0;
  };

  const link = new ApolloLink((operation, forward) => {
    if (isBlocked()) {
      return Observable.of<FetchResult>({
        errors: [
          new GraphQLError(RATE_LIMIT_MESSAGE, {
            extensions: { code: TOO_MANY_REQUESTS },
          }),
        ],
      });
    }

    return forward(operation).map((result) => {
      if (hasRateLimitError(result.errors)) {
        refused();
      } else {
        succeeded();
      }
      return result;
    });
  });

  return { link, isBlocked };
}

export const rateLimitBackoff = createRateLimitBackoff();
