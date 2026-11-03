import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../__tests__/test-utils";

const mocks = vi.hoisted(() => ({
  hostCommunity: null as { id: string; name: string; slug: string } | null,
  createGallery: vi.fn(),
}));

vi.mock("../../contexts/CommunityHostContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../contexts/CommunityHostContext")
  >("../../contexts/CommunityHostContext");
  return {
    ...actual,
    useHostCommunity: () => mocks.hostCommunity,
  };
});

vi.mock("../../generated/graphql", async () => {
  const actual = await vi.importActual<
    typeof import("../../generated/graphql")
  >("../../generated/graphql");
  return {
    ...actual,
    useCreateGalleryMutation: () => [mocks.createGallery],
    useGetMyCharactersQuery: () => ({
      data: { myCharacters: { characters: [] } },
    }),
  };
});

import { CreateGalleryPage } from "../CreateGalleryPage";

describe("CreateGalleryPage", () => {
  beforeEach(() => {
    mocks.hostCommunity = null;
    mocks.createGallery.mockReset();
    mocks.createGallery.mockResolvedValue({
      data: { createGallery: { id: "g1" } },
    });
  });

  it("creates a gallery with no character at the apex", async () => {
    const user = userEvent.setup();
    render(<CreateGalleryPage />);

    await user.type(screen.getByLabelText(/Gallery Name/), "Sketches");
    await user.click(screen.getByRole("button", { name: "Create Gallery" }));

    await vi.waitFor(() => expect(mocks.createGallery).toHaveBeenCalled());
  });

  // A gallery without a character belongs to the community it was made in.
  it("files a gallery with no character under the host's community", async () => {
    mocks.hostCommunity = {
      id: "community-1",
      name: "Willowmere",
      slug: "willowmere",
    };
    const user = userEvent.setup();
    render(<CreateGalleryPage />);

    await user.type(screen.getByLabelText(/Gallery Name/), "Sketches");
    await user.click(screen.getByRole("button", { name: "Create Gallery" }));

    await vi.waitFor(() =>
      expect(mocks.createGallery).toHaveBeenCalledWith({
        variables: {
          input: expect.objectContaining({ communityId: "community-1" }),
        },
      }),
    );
  });
});
