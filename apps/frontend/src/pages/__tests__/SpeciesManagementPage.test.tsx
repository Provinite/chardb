/**
 * Happy-path coverage for SpeciesManagementPage.
 *
 * The "no community" guard is covered in route-param-guards.test.tsx. This
 * file covers the other half of that change: with a community present the
 * queries must still run normally rather than being held back by the `skip`
 * flag they gained when the guard moved below them.
 *
 * The community comes from the hostname now, not the path (#339), so the host
 * context is what gets stubbed here -- both the id and the record, since the
 * page reads the whole thing rather than re-querying it by id.
 *
 * It also covers who is offered the management controls (#221, #430): the
 * page is reachable by every member, so the buttons follow the permission the
 * server will check.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";

const COMMUNITY_ID = "11111111-1111-4111-8111-111111111111";

const hostCommunityId = vi.hoisted(() => ({ current: null as string | null }));

vi.mock("../../contexts/CommunityHostContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../contexts/CommunityHostContext")
  >("../../contexts/CommunityHostContext");
  return {
    ...actual,
    useCommunityId: () => hostCommunityId.current,
    useHostCommunity: () =>
      hostCommunityId.current
        ? {
            id: hostCommunityId.current,
            name: "Test Community",
            slug: "test-community",
          }
        : null,
  };
});

const access = vi.hoisted(() => ({
  isAdmin: false,
  canCreateSpecies: false,
  canEditSpecies: false,
}));

vi.mock("../../contexts/AuthContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../contexts/AuthContext")
  >("../../contexts/AuthContext");
  return {
    ...actual,
    useAuth: () => ({ user: { id: "u-1", isAdmin: access.isAdmin } }),
  };
});

vi.mock("../../hooks/useUserCommunityRole", () => ({
  useUserCommunityRole: () => ({
    loading: false,
    permissions: {
      canCreateSpecies: access.canCreateSpecies,
      canEditSpecies: access.canEditSpecies,
    },
  }),
}));

vi.mock("react-hot-toast", () => {
  const stub = {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  };
  return { default: stub, toast: stub, Toaster: () => null };
});

import {
  SpeciesByCommunityDocument,
  CommunityByIdDocument,
} from "../../generated/graphql";
import { SpeciesManagementPage } from "../SpeciesManagementPage";

const community = {
  __typename: "Community" as const,
  id: COMMUNITY_ID,
  name: "Test Community",
  discordGuildId: null,
  discordGuildName: null,
};

const species = {
  __typename: "Species" as const,
  id: "22222222-2222-4222-8222-222222222222",
  name: "Test Species",
  communityId: COMMUNITY_ID,
  hasImage: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  community,
};

const mocks: MockedResponse[] = [
  {
    request: {
      query: SpeciesByCommunityDocument,
      variables: { communityId: COMMUNITY_ID, first: 50 },
    },
    result: {
      data: {
        speciesByCommunity: {
          __typename: "SpeciesConnection" as const,
          nodes: [species],
          hasNextPage: false,
          hasPreviousPage: false,
          totalCount: 1,
        },
      },
    },
  },
  {
    request: {
      query: CommunityByIdDocument,
      variables: { id: COMMUNITY_ID },
    },
    result: {
      data: {
        community: {
          ...community,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      },
    },
  },
];

const renderPage = () =>
  render(<SpeciesManagementPage />, {
    wrapper: ({ children }) => (
      <MockedProvider mocks={mocks}>
        <MemoryRouter>
          <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
        </MemoryRouter>
      </MockedProvider>
    ),
  });

describe("SpeciesManagementPage", () => {
  beforeEach(() => {
    hostCommunityId.current = COMMUNITY_ID;
    access.isAdmin = false;
    access.canCreateSpecies = false;
    access.canEditSpecies = false;
  });

  it("runs both queries and renders the community's species", async () => {
    renderPage();

    // Resolves only if the species query actually fired despite `skip`.
    expect(await screen.findByText("Test Species")).toBeInTheDocument();
  });

  it("resolves the community name from the second query", async () => {
    renderPage();

    expect(
      await screen.findByText(/Manage species for Test Community/),
    ).toBeInTheDocument();
  });

  it("links each species to its detail page", async () => {
    renderPage();

    const link = await screen.findByRole("link", { name: /Test Species/ });
    expect(link).toHaveAttribute("href", `/species/${species.id}`);
  });

  describe("management controls", () => {
    const manageButtons = ["Traits", "Variants", "Edit"];

    it("offers a plain member none of them", async () => {
      renderPage();
      await screen.findByText("Test Species");

      for (const name of [...manageButtons, "Delete", "Create Species"]) {
        expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
      }
      expect(
        screen.queryByRole("button", { name: /More actions/ }),
      ).not.toBeInTheDocument();
    });

    it("offers Create Species with canCreateSpecies alone", async () => {
      access.canCreateSpecies = true;
      renderPage();
      await screen.findByText("Test Species");

      expect(
        screen.getByRole("button", { name: "Create Species" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Edit" }),
      ).not.toBeInTheDocument();
    });

    it("puts Delete behind the card's menu for canEditSpecies", async () => {
      access.canEditSpecies = true;
      const user = userEvent.setup();
      renderPage();
      await screen.findByText("Test Species");

      for (const name of manageButtons) {
        expect(screen.getByRole("button", { name })).toBeInTheDocument();
      }
      expect(
        screen.queryByRole("button", { name: "Delete" }),
      ).not.toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "More actions for Test Species" }),
      );
      await user.click(screen.getByRole("menuitem", { name: "Delete" }));

      // Hard delete with no way back: the name has to be typed.
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveTextContent('Delete "Test Species"?');
      expect(screen.getByLabelText(/Type Test Species/)).toBeInTheDocument();
    });

    it("offers a site admin the edit controls without a community role", async () => {
      // updateSpecies and removeSpecies allow a global admin; createSpecies
      // does not, so Create still follows the community role.
      access.isAdmin = true;
      renderPage();
      await screen.findByText("Test Species");

      for (const name of manageButtons) {
        expect(screen.getByRole("button", { name })).toBeInTheDocument();
      }
      expect(
        screen.getByRole("button", { name: "More actions for Test Species" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Create Species" }),
      ).not.toBeInTheDocument();
    });
  });
});
