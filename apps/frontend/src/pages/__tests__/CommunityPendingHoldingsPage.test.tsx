/**
 * An external member's pending inventory (#445): once they have linked and
 * claimed everything, the page sends staff to them instead.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import {
  ExternalAccountProvider,
  GetPendingHoldingsDocument,
} from "../../generated/graphql";
import { CommunityPendingHoldingsPage } from "../CommunityPendingHoldingsPage";

const COMMUNITY_ID = "11111111-1111-4111-8111-111111111111";
const DISCORD_ID = "214000000000009071";

vi.mock("../../contexts/CommunityHostContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../contexts/CommunityHostContext")
  >("../../contexts/CommunityHostContext");
  return { ...actual, useCommunityId: () => COMMUNITY_ID };
});

vi.mock("../../hooks/useUserCommunityRole", () => ({
  useUserCommunityRole: () => ({ permissions: { canGrantItems: true } }),
}));

const report = (claimedBy: { id: string; username: string } | null) => ({
  __typename: "PendingHoldingsReport" as const,
  totalItems: 0,
  distinctTypes: 0,
  holdings: [],
  characters: [],
  claimedBy: claimedBy && { __typename: "User" as const, ...claimedBy },
  holder: {
    __typename: "PendingOwnership" as const,
    id: "po1",
    provider: ExternalAccountProvider.Discord,
    providerAccountId: DISCORD_ID,
    displayIdentifier: "neo.baka",
    displayName: "Neo the Baka",
  },
});

const renderAt = (claimedBy: { id: string; username: string } | null) => {
  const mocks: MockedResponse[] = [
    {
      request: {
        query: GetPendingHoldingsDocument,
        variables: {
          communityId: COMMUNITY_ID,
          provider: ExternalAccountProvider.Discord,
          providerAccountId: DISCORD_ID,
        },
      },
      result: { data: { pendingHoldings: report(claimedBy) } },
    },
  ];
  render(
    <MockedProvider mocks={mocks}>
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter
          initialEntries={[`/external-members/discord/${DISCORD_ID}`]}
        >
          <Routes>
            <Route
              path="/external-members/:provider/:accountId"
              element={<CommunityPendingHoldingsPage />}
            />
            <Route
              path="/members/:username/inventory"
              element={<p>inventory of the claimant</p>}
            />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>,
  );
};

describe("CommunityPendingHoldingsPage", () => {
  it("sends staff to the member who claimed it all", async () => {
    renderAt({ id: "u-neo", username: "neo" });

    expect(
      await screen.findByText("inventory of the claimant"),
    ).toBeInTheDocument();
  });

  it("stays put while nobody has claimed it", async () => {
    renderAt(null);

    expect(
      await screen.findByText("Nothing is left waiting for them here."),
    ).toBeInTheDocument();
  });
});
