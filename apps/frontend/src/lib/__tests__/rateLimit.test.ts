import { describe, it, expect, vi } from "vitest";
import { ApolloError } from "@apollo/client";
import { GraphQLError } from "graphql";
import toast from "react-hot-toast";
import {
  hasRateLimitError,
  isRateLimited,
  notifyRateLimited,
  RATE_LIMIT_MESSAGE,
  TOO_MANY_REQUESTS,
} from "../rateLimit";

vi.mock("react-hot-toast", () => ({ default: { error: vi.fn() } }));

const throttled = new GraphQLError(RATE_LIMIT_MESSAGE, {
  extensions: { code: TOO_MANY_REQUESTS },
});
const other = new GraphQLError("Invalid credentials", {
  extensions: { code: "UNAUTHENTICATED" },
});

describe("rate limit detection", () => {
  it("recognises the code, not the message", () => {
    expect(hasRateLimitError([other, throttled])).toBe(true);
    expect(hasRateLimitError([other])).toBe(false);
    expect(hasRateLimitError([new GraphQLError(RATE_LIMIT_MESSAGE)])).toBe(
      false,
    );
    expect(hasRateLimitError(undefined)).toBe(false);
  });

  it("only treats an ApolloError carrying the code as rate limited", () => {
    expect(isRateLimited(new ApolloError({ graphQLErrors: [throttled] }))).toBe(
      true,
    );
    expect(isRateLimited(new ApolloError({ graphQLErrors: [other] }))).toBe(
      false,
    );
    expect(isRateLimited(new Error(RATE_LIMIT_MESSAGE))).toBe(false);
  });

  it("reuses one toast id so simultaneous refusals collapse into one", () => {
    notifyRateLimited();
    notifyRateLimited();
    expect(vi.mocked(toast.error).mock.calls).toEqual([
      [RATE_LIMIT_MESSAGE, { id: TOO_MANY_REQUESTS }],
      [RATE_LIMIT_MESSAGE, { id: TOO_MANY_REQUESTS }],
    ]);
  });
});
