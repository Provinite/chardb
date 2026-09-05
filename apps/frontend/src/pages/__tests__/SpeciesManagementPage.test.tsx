/**
 * Happy-path coverage for SpeciesManagementPage.
 *
 * The "no community" guard is covered in route-param-guards.test.tsx. This
 * file covers the other half of that change: with a community present the
 * queries must still run normally rather than being held back by the `skip`
 * flag they gained when the guard moved below them.
 *
 * The community comes from the hostname now, not the path (#339), so it is
 * `useCommunityId` that gets stubbed here.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
  return { ...actual, useCommunityId: () => hostCommunityId.current };
});

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
});
