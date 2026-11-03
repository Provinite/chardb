import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { render, createMockUser } from "../../__tests__/test-utils";

const mocks = vi.hoisted(() => ({
  viewerId: "viewer-1" as string | null,
  followersCount: 3,
  isMemberOf: true,
  isMemberOfSkipped: vi.fn(),
  replaceLocation: vi.fn(),
}));

vi.mock("../../lib/replaceLocation", () => ({
  replaceLocation: mocks.replaceLocation,
}));

vi.mock("../../contexts/CommunityHostContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../contexts/CommunityHostContext")
  >("../../contexts/CommunityHostContext");
  return {
    ...actual,
    useCommunityId: () => "community-1",
    useHostCommunity: () => ({
      id: "community-1",
      name: "Willowmere",
      slug: "willowmere",
    }),
  };
});

vi.mock("../../contexts/AuthContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../contexts/AuthContext")
  >("../../contexts/AuthContext");
  return {
    ...actual,
    useAuth: () => ({
      user: mocks.viewerId ? createMockUser({ id: mocks.viewerId }) : null,
    }),
  };
});

vi.mock("../../components/FollowButton", () => ({
  FollowButton: () => <button type="button">Follow</button>,
}));

vi.mock("../../generated/graphql", async () => {
  const actual = await vi.importActual<
    typeof import("../../generated/graphql")
  >("../../generated/graphql");
  return {
    ...actual,
    useCommunityMemberProfileQuery: () => ({
      loading: false,
      data: {
        user: {
          id: "member-1",
          username: "bob",
          displayName: "Bob",
          bio: null,
          avatarImage: null,
          followersCount: mocks.followersCount,
          followingCount: 5,
          achievements: [],
        },
      },
    }),
    useIsMemberOfQuery: (options: { skip?: boolean }) => {
      mocks.isMemberOfSkipped(Boolean(options.skip));
      return options.skip
        ? { loading: false, data: undefined }
        : {
            loading: false,
            data: { user: { id: "member-1", isMemberOf: mocks.isMemberOf } },
          };
    },
    useCommunityMemberRolesQuery: () => ({
      data: { communityMemberRoles: [] },
    }),
    useUserCharactersQuery: () => ({
      loading: false,
      data: { userCharacters: { characters: [], total: 0 } },
    }),
  };
});

import { CommunityMemberProfilePage } from "../CommunityMemberProfilePage";

const renderProfile = () => {
  window.history.pushState({}, "", "/members/bob");
  const result = render(
    <Routes>
      <Route
        path="/members/:username"
        element={<CommunityMemberProfilePage />}
      />
    </Routes>,
  );
  // Guards the negative assertions: an unmatched route renders nothing.
  expect(screen.getByRole("heading", { name: "Bob" })).toBeInTheDocument();
  return result;
};

describe("CommunityMemberProfilePage", () => {
  beforeEach(() => {
    mocks.viewerId = "viewer-1";
    mocks.isMemberOf = true;
    mocks.followersCount = 3;
    mocks.isMemberOfSkipped.mockClear();
    mocks.replaceLocation.mockClear();
  });

  // A member page for a stranger implies they belong here.
  it("sends a non-member to their main-site profile", () => {
    mocks.isMemberOf = false;
    window.history.pushState({}, "", "/members/bob");
    render(
      <Routes>
        <Route
          path="/members/:username"
          element={<CommunityMemberProfilePage />}
        />
      </Routes>,
    );

    expect(mocks.replaceLocation).toHaveBeenCalledWith(
      expect.stringMatching(/^https?:\/\/[^/]+\/user\/bob$/),
    );
    expect(screen.queryByRole("heading", { name: "Bob" })).toBeNull();
  });

  // Membership is only answered to signed-in viewers.
  it("shows the member page to a signed-out visitor without asking", () => {
    mocks.viewerId = null;
    renderProfile();

    expect(mocks.isMemberOfSkipped).toHaveBeenLastCalledWith(true);
    expect(mocks.replaceLocation).not.toHaveBeenCalled();
  });

  // The profile is served on every host now, so nothing here leaves it.
  it("has no link off to the site profile", () => {
    renderProfile();

    expect(screen.queryByText("Site profile")).not.toBeInTheDocument();
  });

  it("links followers and following on this host", () => {
    renderProfile();

    expect(screen.getByRole("link", { name: "3 followers" })).toHaveAttribute(
      "href",
      "/user/bob/followers",
    );
    expect(screen.getByRole("link", { name: "5 following" })).toHaveAttribute(
      "href",
      "/user/bob/following",
    );
  });

  it("says follower, not followers, for one", () => {
    mocks.followersCount = 1;
    renderProfile();

    expect(
      screen.getByRole("link", { name: "1 follower" }),
    ).toBeInTheDocument();
  });

  it("links their galleries and media here", () => {
    renderProfile();

    expect(screen.getByRole("link", { name: "Galleries" })).toHaveAttribute(
      "href",
      "/user/bob/galleries",
    );
    expect(screen.getByRole("link", { name: "Media" })).toHaveAttribute(
      "href",
      "/user/bob/media",
    );
  });

  it("offers to follow someone else", () => {
    renderProfile();

    expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Edit profile" }),
    ).not.toBeInTheDocument();
  });

  it("offers to edit your own profile here", () => {
    mocks.viewerId = "member-1";
    renderProfile();

    expect(screen.getByRole("link", { name: "Edit profile" })).toHaveAttribute(
      "href",
      "/profile/edit",
    );
    expect(
      screen.queryByRole("button", { name: "Follow" }),
    ).not.toBeInTheDocument();
  });
});
