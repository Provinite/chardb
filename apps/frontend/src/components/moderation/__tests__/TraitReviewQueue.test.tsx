/**
 * The queue's own state, with the network mocked at the generated hooks: what
 * one card's action in flight does to the others.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import {
  ModerationStatus,
  TraitReviewSource,
  type TraitReviewQueueQuery,
} from "../../../generated/graphql";

type QueueItem = TraitReviewQueueQuery["traitReviewQueue"]["items"][0];

const item = (n: number): QueueItem => ({
  __typename: "TraitReviewQueueItem",
  characterId: `char-${n}`,
  characterName: `Character ${n}`,
  registryId: null,
  speciesName: "Willowisp",
  variantName: "Standard",
  review: {
    __typename: "TraitReview",
    id: `review-${n}`,
    characterId: `char-${n}`,
    status: ModerationStatus.Pending,
    source: TraitReviewSource.Creation,
    proposedForms: [],
    previousForms: [],
    appliedForms: [],
    rejectionReason: null,
    resolvedAt: null,
    createdAt: "2026-10-26T00:00:00Z",
    deferredAt: null,
    deferralCount: 0,
    deferralNote: null,
    deferredBy: null,
    resolvedBy: null,
    character: {
      __typename: "Character",
      id: `char-${n}`,
      speciesId: "species-1",
      speciesVariantId: "variant-1",
      mainMedia: null,
    },
  },
});

// Never settles, so card 1's approve stays in flight for the whole test.
const approve = vi.fn(() => new Promise<never>(() => {}));

vi.mock("../../../generated/graphql", async () => {
  const actual = await vi.importActual<
    typeof import("../../../generated/graphql")
  >("../../../generated/graphql");
  return {
    ...actual,
    useTraitReviewQueueQuery: () => ({
      data: {
        traitReviewQueue: {
          __typename: "TraitReviewQueueResult",
          items: [item(1), item(2)],
          total: 2,
          hasMore: false,
        },
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    }),
    useApproveTraitReviewMutation: () => [approve],
    useRevertTraitReviewMutation: () => [vi.fn()],
    useDeferTraitReviewMutation: () => [vi.fn()],
    useDeleteCharacterMutation: () => [vi.fn()],
    useKickCharacterFromSpeciesMutation: () => [vi.fn()],
  };
});

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u-1", isAdmin: false } }),
}));

vi.mock("../../../hooks/useUserCommunityRole", () => ({
  useUserCommunityRole: () => ({
    loading: false,
    permissions: { canDeleteCharacter: true, canEditCharacterRegistry: true },
  }),
}));

// The diff renders traits; nothing here is about them.
vi.mock("../FormDiffDisplay", () => ({ FormDiffDisplay: () => null }));

vi.mock("react-hot-toast", () => {
  const stub = { success: vi.fn(), error: vi.fn() };
  return { default: stub, toast: stub, Toaster: () => null };
});

import { TraitReviewQueue } from "../TraitReviewQueue";

describe("TraitReviewQueue", () => {
  it("does not open another card's dialog as busy while one card approves", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ThemeProvider theme={lightTheme}>
          <TraitReviewQueue communityId="community-1" />
        </ThemeProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getAllByRole("button", { name: "Approve" })[0]);
    expect(approve).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole("button", { name: "More actions for Character 2" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("button", { name: "Delete" }),
    ).toBeEnabled();
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toBeEnabled();
  });
});
