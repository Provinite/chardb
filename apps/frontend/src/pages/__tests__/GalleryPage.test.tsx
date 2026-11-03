import { describe, it, expect, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import { render } from "../../__tests__/test-utils";

const mocks = vi.hoisted(() => ({
  mediaVariables: vi.fn(),
}));

vi.mock("../../contexts/CommunityHostContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../contexts/CommunityHostContext")
  >("../../contexts/CommunityHostContext");
  return {
    ...actual,
    useHostCommunity: () => ({
      id: "community-1",
      name: "Willowmere",
      slug: "willowmere",
    }),
  };
});

vi.mock("../../generated/graphql", async () => {
  const actual = await vi.importActual<
    typeof import("../../generated/graphql")
  >("../../generated/graphql");
  return {
    ...actual,
    useGetGalleryQuery: () => ({ loading: true }),
    useGetMediaQuery: (options: { variables: unknown }) => {
      mocks.mediaVariables(options.variables);
      return { loading: true };
    },
  };
});

import { GalleryPage } from "../GalleryPage";

describe("GalleryPage", () => {
  // Media the community host would not open has no business in the grid.
  it("lists only this community's media on a community host", () => {
    window.history.pushState({}, "", "/gallery/g1");
    render(
      <Routes>
        <Route path="/gallery/:id" element={<GalleryPage />} />
      </Routes>,
    );

    expect(mocks.mediaVariables).toHaveBeenCalledWith({
      filters: { galleryId: "g1", communityId: "community-1" },
    });
  });
});
