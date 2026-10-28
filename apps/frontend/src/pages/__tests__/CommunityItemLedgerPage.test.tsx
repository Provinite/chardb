/**
 * Typing into the ledger search (#444): the page stays put, the search box
 * keeps focus, and the server hears one search when typing stops rather than
 * one per letter.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider } from "@apollo/client/testing";
import { ApolloLink, Observable } from "@apollo/client";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import { ItemTransactionKind } from "../../generated/graphql";
import { CommunityItemLedgerPage } from "../CommunityItemLedgerPage";

const COMMUNITY_ID = "11111111-1111-4111-8111-111111111111";

vi.mock("../../contexts/CommunityHostContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../contexts/CommunityHostContext")
  >("../../contexts/CommunityHostContext");
  return {
    ...actual,
    useCommunityId: () => COMMUNITY_ID,
    useHostCommunity: () => ({
      id: COMMUNITY_ID,
      name: "Cloverse",
      slug: "cloverse",
    }),
  };
});

const user = {
  __typename: "User" as const,
  id: "u-1",
  username: "member",
  displayName: null,
  avatarImage: null,
};

const grant = {
  __typename: "ItemTransaction" as const,
  id: "t-1",
  communityId: COMMUNITY_ID,
  kind: ItemTransactionKind.Grant,
  batchId: null,
  batchSize: 1,
  reason: "Lanternfall prompt completion",
  staffNote: null,
  actorLabel: null,
  createdAt: "2026-10-20T00:00:00.000Z",
  itemId: "i-1",
  itemType: {
    __typename: "ItemType" as const,
    id: "it-1",
    name: "Trait Change Potion",
    category: null,
    color: null,
    image: null,
  },
  fromUser: null,
  toUser: user,
  actorUser: user,
};

/**
 * Answers every ledger query with the one seeded grant, slowly enough that the
 * page is caught mid-load, and records the search each query carried.
 */
const recordingLink = (searches: Array<string | undefined>) =>
  new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        const { filters } = operation.variables as {
          filters: { search?: string };
        };
        searches.push(filters.search);
        const timer = setTimeout(() => {
          observer.next({
            data: {
              itemTransactions: {
                __typename: "ItemTransactionConnection",
                transactions: [grant],
                total: 1,
                hasMore: false,
              },
            },
          });
          observer.complete();
        }, 100);
        return () => clearTimeout(timer);
      }),
  );

const renderLedger = (searches: Array<string | undefined>) =>
  render(
    <MockedProvider link={recordingLink(searches)}>
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>
          <CommunityItemLedgerPage />
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>,
  );

describe("CommunityItemLedgerPage search", () => {
  it("keeps the search box and its focus while a search loads", async () => {
    const searches: Array<string | undefined> = [];
    renderLedger(searches);
    await screen.findByText("Trait Change Potion");

    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search the ledger" }),
      "Lanternfall",
      { delay: 30 },
    );

    const search = screen.getByRole("searchbox", { name: "Search the ledger" });
    expect(search).toHaveFocus();
    expect(search).toHaveValue("Lanternfall");
  });

  it("queries once when typing stops, not once per letter", async () => {
    const searches: Array<string | undefined> = [];
    renderLedger(searches);
    await screen.findByText("Trait Change Potion");

    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search the ledger" }),
      "Lanternfall",
      { delay: 30 },
    );

    await waitFor(() => expect(searches).toContain("Lanternfall"));
    expect(searches).toEqual([undefined, "Lanternfall"]);
  });
});
