import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  hostCommunity: null as { id: string; name: string; slug: string } | null,
}));

vi.mock("../../contexts/CommunityHostContext", () => ({
  useHostCommunity: () => mocks.hostCommunity,
}));

import { useHostCommunityScope } from "../useHostCommunityScope";

describe("useHostCommunityScope", () => {
  beforeEach(() => {
    mocks.hostCommunity = null;
  });

  it("adds nothing at the apex", () => {
    const { result } = renderHook(() => useHostCommunityScope());

    expect(result.current).toEqual({});
  });

  it("names the host's community on a community host", () => {
    mocks.hostCommunity = {
      id: "community-1",
      name: "Willowmere",
      slug: "willowmere",
    };

    const { result } = renderHook(() => useHostCommunityScope());

    expect(result.current).toEqual({ communityId: "community-1" });
  });
});
