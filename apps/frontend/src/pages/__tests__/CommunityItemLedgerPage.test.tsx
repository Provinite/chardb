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

type Filters = { search?: string; limit: number };

/**
 * Answers every ledger query slowly enough that the page is caught mid-load,
 * and records the filters each query carried. A search nothing matches
 * ("zzz") comes back empty; anything else returns the one seeded grant, with
 * more to load when unfiltered.
 */
const recordingLink = (sent: Filters[], { emptyLedger = false } = {}) =>
  new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        const { filters } = operation.variables as { filters: Filters };
        sent.push(filters);
        const empty = emptyLedger || filters.search === "zzz";
        const timer = setTimeout(() => {
          observer.next({
            data: {
              itemTransactions: {
                __typename: "ItemTransactionConnection",
                transactions: empty ? [] : [grant],
                total: empty ? 0 : 60,
                hasMore: !empty && !filters.search,
              },
            },
          });
          observer.complete();
        }, 100);
        return () => clearTimeout(timer);
      }),
  );

const renderLedger = (sent: Filters[], options?: { emptyLedger?: boolean }) =>
  render(
    <MockedProvider link={recordingLink(sent, options)}>
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>
          <CommunityItemLedgerPage />
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>,
  );

const searchBox = () =>
  screen.getByRole("searchbox", { name: "Search the ledger" });

const searches = (sent: Filters[]) => sent.map((f) => f.search);

describe("CommunityItemLedgerPage search", () => {
  it("keeps the search box and its focus through a search", async () => {
    const sent: Filters[] = [];
    renderLedger(sent);
    await screen.findByText("Trait Change Potion");

    await userEvent.type(searchBox(), "Lanternfall", { delay: 30 });

    // Asserted after the search has landed, not inside the debounce window,
    // where a page that swapped out on load would still look fine.
    await waitFor(() => expect(searches(sent)).toContain("Lanternfall"));
    await waitFor(() =>
      expect(screen.getByTestId("ledger-table")).toHaveAttribute(
        "aria-busy",
        "false",
      ),
    );
    expect(searchBox()).toHaveFocus();
    expect(searchBox()).toHaveValue("Lanternfall");
  });

  it("queries once when typing stops, not once per letter", async () => {
    const sent: Filters[] = [];
    renderLedger(sent);
    await screen.findByText("Trait Change Potion");

    await userEvent.type(searchBox(), "Lanternfall", { delay: 30 });

    await waitFor(() => expect(searches(sent)).toContain("Lanternfall"));
    expect(searches(sent)).toEqual([undefined, "Lanternfall"]);
  });

  it("queries once after Load more, without refetching the old search", async () => {
    const sent: Filters[] = [];
    renderLedger(sent);
    await screen.findByText("Trait Change Potion");

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(sent).toHaveLength(2));

    await userEvent.type(searchBox(), "Lanternfall", { delay: 30 });

    await waitFor(() => expect(searches(sent)).toContain("Lanternfall"));
    expect(sent).toEqual([
      { ...sent[0], search: undefined, limit: 25 },
      { ...sent[0], search: undefined, limit: 50 },
      { ...sent[0], search: "Lanternfall", limit: 25 },
    ]);
  });

  it("starts from the first page on returning to a search Load more was used on", async () => {
    const sent: Filters[] = [];
    renderLedger(sent);
    await screen.findByText("Trait Change Potion");

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(sent).toHaveLength(2));

    await userEvent.type(searchBox(), "Lanternfall");
    await waitFor(() => expect(searches(sent)).toContain("Lanternfall"));
    await userEvent.clear(searchBox());

    await waitFor(() => expect(sent).toHaveLength(4));
    expect(sent[3]).toMatchObject({ search: undefined, limit: 25 });
  });

  it("disables Load more while typing, before the new search is sent", async () => {
    const sent: Filters[] = [];
    renderLedger(sent);
    await screen.findByText("Trait Change Potion");

    await userEvent.type(searchBox(), "Lan");

    expect(screen.getByRole("button", { name: "Load more" })).toBeDisabled();
  });

  it("calls an empty ledger empty when the search is only spaces", async () => {
    const sent: Filters[] = [];
    renderLedger(sent, { emptyLedger: true });
    await screen.findByText(/Nothing has moved yet/);

    await userEvent.type(searchBox(), " ");

    // Past the debounce: a blank search is no search, so nothing re-queries
    // and the verdict must not change to "no match".
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(screen.getByText(/Nothing has moved yet/)).toBeInTheDocument();
  });

  it("marks the results stale while typing, before the query is sent", async () => {
    const sent: Filters[] = [];
    renderLedger(sent);
    await screen.findByText("Trait Change Potion");

    await userEvent.type(searchBox(), "Lan");

    expect(sent).toHaveLength(1);
    expect(screen.getByTestId("ledger-table")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("does not call the ledger empty while a cleared search reloads", async () => {
    const sent: Filters[] = [];
    renderLedger(sent);
    await screen.findByText("Trait Change Potion");

    await userEvent.type(searchBox(), "zzz");
    await screen.findByText("No events match those filters.");

    await userEvent.clear(searchBox());

    expect(screen.queryByText(/Nothing has moved yet/)).toBeNull();
    await screen.findByText("Trait Change Potion");
  });
});
