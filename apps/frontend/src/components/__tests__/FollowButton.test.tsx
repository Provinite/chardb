import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { InMemoryCache, gql } from "@apollo/client";
import userEvent from "@testing-library/user-event";
import {
  GetFollowStatusDocument,
  ToggleFollowDocument,
} from "../../generated/graphql";

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "viewer" } }),
}));

import { FollowButton } from "../FollowButton";

const followed: MockedResponse = {
  request: { query: GetFollowStatusDocument, variables: { userId: "them" } },
  result: {
    data: {
      followStatus: {
        __typename: "FollowStatus",
        isFollowing: true,
        followersCount: 1,
        followingCount: 0,
      },
    },
  },
};

const renderButton = () =>
  render(
    <MockedProvider mocks={[followed]}>
      <FollowButton userId="them" showCount={false} />
    </MockedProvider>,
  );

describe("FollowButton", () => {
  it("claims neither Follow nor Following until it knows which", () => {
    renderButton();

    expect(screen.queryByRole("button", { name: "Follow" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Following" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Loading follow status" }),
    ).toBeInTheDocument();
  });

  it("says Following once the status arrives", async () => {
    renderButton();

    expect(
      await screen.findByRole("button", { name: "Following" }),
    ).toBeInTheDocument();
  });

  // Any page showing this person's follower count reads it off the cached
  // User, so the follow updates it there before the server answers.
  it("updates the person's follower count everywhere it is cached", async () => {
    const cache = new InMemoryCache();
    cache.writeFragment({
      id: "User:them",
      fragment: gql`
        fragment Counted on User {
          id
          followersCount
        }
      `,
      data: { __typename: "User", id: "them", followersCount: 1 },
    });
    const unfollow: MockedResponse = {
      request: {
        query: ToggleFollowDocument,
        variables: { input: { targetUserId: "them" } },
      },
      // Never answers: only the optimistic write can have changed the count.
      delay: Infinity,
      result: { data: null },
    };

    render(
      <MockedProvider mocks={[followed, unfollow]} cache={cache}>
        <FollowButton userId="them" showCount={false} />
      </MockedProvider>,
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Following" }),
    );

    await vi.waitFor(() =>
      expect(
        cache.readFragment<{ followersCount: number }>(
          {
            id: "User:them",
            fragment: gql`
              fragment Counted on User {
                followersCount
              }
            `,
          },
          // What watching queries see while the mutation is in flight.
          true,
        )?.followersCount,
      ).toBe(0),
    );
  });
});
