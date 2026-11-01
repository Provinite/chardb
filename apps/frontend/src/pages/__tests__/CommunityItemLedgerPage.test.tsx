/**
 * Typing into the ledger search (#444): the page stays put, the search box
 * keeps focus, and the server hears one search when typing stops rather than
 * one per letter.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider } from "@apollo/client/testing";
import { ApolloLink, Observable } from "@apollo/client";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import {
  ExternalAccountProvider,
  ItemTransactionKind,
  type ItemTransactionFieldsFragment,
} from "../../generated/graphql";
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
  batchId: "b-1",
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
  pendingOwner: null,
};

const discordOwner: NonNullable<ItemTransactionFieldsFragment["pendingOwner"]> =
  {
    __typename: "PendingOwnership",
    id: "po-1",
    provider: ExternalAccountProvider.Discord,
    providerAccountId: "214000000000009071",
    displayIdentifier: "neo.baka",
    displayName: "Neo the Baka",
  };

/** A grant still waiting on a Discord account, with the names it was given. */
const pendingGrant: ItemTransactionFieldsFragment = {
  ...grant,
  id: "t-2",
  batchId: "b-2",
  itemId: "i-2",
  toUser: null,
  reason: "Hollowtide 2025 prize",
  pendingOwner: discordOwner,
};

type Filters = {
  search?: string;
  limit: number;
  offset: number;
  kinds?: string[];
};

/**
 * Answers every ledger query slowly enough that the page is caught mid-load,
 * and records the filters each query carried. A search nothing matches
 * ("zzz") comes back empty; anything else returns the one seeded grant, with
 * more to load when unfiltered.
 */
type LedgerOptions = {
  emptyLedger?: boolean;
  /** What the ledger holds instead of the one member grant. */
  rows?: ItemTransactionFieldsFragment[];
  /** What a page past the first holds. The first page's rows by default. */
  nextPage?: ItemTransactionFieldsFragment[];
  /** What a kind filter's first page holds. The first page's rows by default. */
  kindRows?: ItemTransactionFieldsFragment[];
  /** How long a reply takes, in ms. 100 by default. */
  delay?: (filters: Filters) => number;
};

const recordingLink = (
  sent: Filters[],
  {
    emptyLedger = false,
    rows = [grant],
    nextPage,
    kindRows,
    delay = () => 100,
  }: LedgerOptions = {},
) =>
  new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        const { filters } = operation.variables as { filters: Filters };
        sent.push(filters);
        const empty = emptyLedger || filters.search === "zzz";
        const page =
          filters.offset > 0
            ? (nextPage ?? rows)
            : filters.kinds
              ? (kindRows ?? rows)
              : rows;
        const timer = setTimeout(() => {
          observer.next({
            data: {
              itemTransactions: {
                __typename: "ItemTransactionConnection",
                transactions: empty ? [] : page,
                hasMore: !empty && !filters.search,
              },
            },
          });
          observer.complete();
        }, delay(filters));
        return () => clearTimeout(timer);
      }),
  );

const renderLedger = (sent: Filters[], options?: LedgerOptions) =>
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

describe("CommunityItemLedgerPage pending holders (#445)", () => {
  it("names the Discord account an unclaimed grant waits on", async () => {
    renderLedger([], { rows: [pendingGrant] });
    const row = await screen.findByTestId("ledger-row");

    expect(row).toHaveTextContent("Neo the Baka (@neo.baka)");
    expect(row).not.toHaveTextContent("pending claim");
  });

  it("falls back to the username, then the id", async () => {
    const usernameOnly = {
      ...pendingGrant,
      pendingOwner: { ...discordOwner, displayName: null },
    };
    const idOnly = {
      ...pendingGrant,
      id: "t-3",
      batchId: "b-3",
      itemId: "i-3",
      reason: "Older prize",
      pendingOwner: {
        ...discordOwner,
        id: "po-2",
        providerAccountId: "214000000000000001",
        displayIdentifier: null,
        displayName: null,
      },
    };
    renderLedger([], { rows: [usernameOnly, idOnly] });
    const rows = await screen.findAllByTestId("ledger-row");

    expect(rows[0]).toHaveTextContent("@neo.baka");
    expect(rows[1]).toHaveTextContent("Discord 214000000000000001");
  });

  it("says only which kind of account to a viewer who may not see who", async () => {
    // The server blanks the id and names for viewers without permission.
    const hidden = {
      ...pendingGrant,
      pendingOwner: {
        ...discordOwner,
        providerAccountId: "",
        displayIdentifier: "",
        displayName: "",
      },
    };
    renderLedger([], { rows: [hidden] });
    const row = await screen.findByTestId("ledger-row");

    expect(row).toHaveTextContent("Discord account");
    expect(row).not.toHaveTextContent("@");
    // No page to send them to without the id.
    expect(within(row).queryByRole("link", { name: /Discord/ })).toBeNull();
  });

  it("links the holder to what still waits on them", async () => {
    renderLedger([], { rows: [pendingGrant] });
    const row = await screen.findByTestId("ledger-row");

    expect(
      within(row).getByRole("link", { name: /Neo the Baka/ }),
    ).toHaveAttribute("href", "/external-members/discord/214000000000009071");
  });
});

describe("CommunityItemLedgerPage footer", () => {
  it("counts the events on screen and nothing else", async () => {
    // Items per batch and the server's row total read as noise next to the
    // lines a person can actually see.
    renderLedger([]);
    await screen.findByText("Trait Change Potion");

    expect(screen.getByText("Showing 1 event")).toBeInTheDocument();
    expect(screen.queryByText(/across \d+ of \d+/)).toBeNull();
  });
});

/** A grant from before the first page, served past it. */
const older: ItemTransactionFieldsFragment = {
  ...grant,
  id: "t-9",
  batchId: "b-9",
  itemId: "i-9",
  reason: "An older grant",
};

describe("CommunityItemLedgerPage Load more", () => {
  it("asks for the next page only, and adds it below what is on screen", async () => {
    // Refetching from the top with a larger limit cost the server the whole
    // list again on every click, and past 100 rows it refused.
    const sent: Filters[] = [];
    renderLedger(sent, { nextPage: [older] });
    await screen.findByText("Trait Change Potion");

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    await screen.findByText("An older grant");
    expect(sent[1]).toMatchObject({ limit: 25, offset: 1 });
    expect(screen.getAllByTestId("ledger-row")).toHaveLength(2);
  });

  it("drops a page that lands after the filter it was for has changed", async () => {
    // The kind filter's own page lands first, then the old filter's page.
    const sent: Filters[] = [];
    renderLedger(sent, {
      nextPage: [older],
      kindRows: [pendingGrant],
      delay: (f) => (f.offset > 0 ? 600 : 100),
    });
    await screen.findByText("Trait Change Potion");

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    await userEvent.click(screen.getByRole("button", { name: "Granted" }));

    await screen.findByText("Hollowtide 2025 prize");
    await waitFor(() => expect(sent).toHaveLength(3));
    // Past the old page's arrival.
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(screen.queryByText("An older grant")).toBeNull();
    expect(screen.getAllByTestId("ledger-row")).toHaveLength(1);
  });

  it("drops a page that lands before the new filter has any results", async () => {
    // Nothing is cached for the kind filter yet when the old page lands.
    const sent: Filters[] = [];
    renderLedger(sent, {
      nextPage: [older],
      kindRows: [pendingGrant],
      delay: (f) => (f.offset > 0 ? 100 : f.kinds ? 600 : 100),
    });
    await screen.findByText("Trait Change Potion");

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    await userEvent.click(screen.getByRole("button", { name: "Granted" }));

    await screen.findByText("Hollowtide 2025 prize", {}, { timeout: 2000 });
    expect(screen.queryByText("An older grant")).toBeNull();
    expect(screen.getAllByTestId("ledger-row")).toHaveLength(1);
  });

  it("shows a row once when new events push it onto the next page", async () => {
    const sent: Filters[] = [];
    renderLedger(sent, { nextPage: [grant, older] });
    await screen.findByText("Trait Change Potion");

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    await screen.findByText("An older grant");
    expect(screen.getAllByTestId("ledger-row")).toHaveLength(2);
  });
});

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
      { ...sent[0], search: undefined, limit: 25, offset: 0 },
      { ...sent[0], search: undefined, limit: 25, offset: 1 },
      { ...sent[0], search: "Lanternfall", limit: 25, offset: 0 },
    ]);
  });

  it("starts from the first page on returning to a search Load more was used on", async () => {
    const sent: Filters[] = [];
    renderLedger(sent, { nextPage: [older] });
    await screen.findByText("Trait Change Potion");

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    await screen.findByText("An older grant");

    await userEvent.type(searchBox(), "Lanternfall");
    await waitFor(() => expect(searches(sent)).toContain("Lanternfall"));
    await waitFor(() =>
      expect(screen.getAllByTestId("ledger-row")).toHaveLength(1),
    );
    await userEvent.clear(searchBox());

    await waitFor(() => expect(sent).toHaveLength(4));
    expect(sent[3]).toMatchObject({ search: undefined, limit: 25, offset: 0 });
    // Not both pages from the cache in the meantime.
    expect(screen.queryByText("An older grant")).toBeNull();
    await waitFor(() =>
      expect(screen.getByTestId("ledger-table")).toHaveAttribute(
        "aria-busy",
        "false",
      ),
    );
    expect(screen.getAllByTestId("ledger-row")).toHaveLength(1);
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
