import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { GetFollowStatusDocument } from "../../generated/graphql";

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
});
