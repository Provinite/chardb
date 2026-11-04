/**
 * Usernames ignore case, so a page reached as `/user/FOO` and then corrected
 * to `/user/foo` asks for the same person twice. The cache answers the second
 * ask from the first instead of going back to the server.
 */
import { describe, it, expect } from "vitest";
import { createCache } from "../apolloCache";
import {
  GetFollowersDocument,
  type GetFollowersQuery,
  UserIdentityDocument,
  type UserIdentityQuery,
} from "../../generated/graphql";

const user = {
  __typename: "User" as const,
  id: "user-1",
  username: "MixedCase",
  displayName: null,
};

describe("username-keyed queries", () => {
  it("reads `user` written under another casing", () => {
    const cache = createCache();
    cache.writeQuery<UserIdentityQuery>({
      query: UserIdentityDocument,
      variables: { username: "MIXEDCASE" },
      data: { __typename: "Query", user: { ...user, avatarImage: null } },
    });

    const read = cache.readQuery<UserIdentityQuery>({
      query: UserIdentityDocument,
      variables: { username: "MixedCase" },
    });

    expect(read?.user?.id).toBe("user-1");
  });

  it("reads `getFollowers` written under another casing", () => {
    const cache = createCache();
    cache.writeQuery<GetFollowersQuery>({
      query: GetFollowersDocument,
      variables: { username: "mixedcase" },
      data: {
        __typename: "Query",
        getFollowers: {
          __typename: "FollowListResult",
          user,
          followers: [],
        },
      },
    });

    const read = cache.readQuery<GetFollowersQuery>({
      query: GetFollowersDocument,
      variables: { username: "MixedCase" },
    });

    expect(read?.getFollowers.user.id).toBe("user-1");
  });

  it("keeps two different people apart", () => {
    const cache = createCache();
    cache.writeQuery<UserIdentityQuery>({
      query: UserIdentityDocument,
      variables: { username: "MixedCase" },
      data: { __typename: "Query", user: { ...user, avatarImage: null } },
    });

    const read = cache.readQuery<UserIdentityQuery>({
      query: UserIdentityDocument,
      variables: { username: "someoneelse" },
    });

    expect(read).toBeNull();
  });
});
