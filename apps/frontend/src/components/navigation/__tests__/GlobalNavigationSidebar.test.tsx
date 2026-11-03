import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render, createMockUser } from "../../../__tests__/test-utils";

const mocks = vi.hoisted(() => ({
  slug: null as string | null,
}));

vi.mock("../../../contexts/CommunityHostContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../../contexts/CommunityHostContext")
  >("../../../contexts/CommunityHostContext");
  return {
    ...actual,
    useCommunityHost: () => ({
      slug: mocks.slug,
      community: null,
      loading: false,
      isUnknownHost: false,
      unreachable: false,
      refetch: () => undefined,
    }),
  };
});

vi.mock("../../../contexts/AuthContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../../contexts/AuthContext")
  >("../../../contexts/AuthContext");
  return {
    ...actual,
    useAuth: () => ({ user: createMockUser({ username: "bob" }) }),
  };
});

vi.mock("../../spotlight/SpotlightContext", () => ({
  useSpotlight: () => ({ open: () => undefined }),
}));

import { GlobalNavigationSidebar } from "../GlobalNavigationSidebar";

const hrefOf = (name: string) =>
  screen.getByRole("link", { name }).getAttribute("href");

describe("GlobalNavigationSidebar", () => {
  beforeEach(() => {
    mocks.slug = null;
  });

  // A community host serves these itself, narrowed to the community, so the
  // sidebar never leaves for the apex.
  it.each([
    ["My Characters", "/my/characters"],
    ["My Galleries", "/my/galleries"],
    ["My Media", "/my/media"],
    ["Activity Feed", "/feed"],
    ["My Profile", "/user/bob"],
    ["All Galleries", "/galleries"],
    ["All Media", "/media"],
    ["Dashboard", "/dashboard"],
  ])("keeps %s on a community host", (name, path) => {
    mocks.slug = "willowmere";
    render(<GlobalNavigationSidebar />);

    expect(hrefOf(name)).toBe(path);
  });

  it("still sends Join Community to the apex", () => {
    mocks.slug = "willowmere";
    render(<GlobalNavigationSidebar />);

    expect(hrefOf("Join Community")).toMatch(/^https?:\/\/[^/]+\/join-community$/);
  });
});
