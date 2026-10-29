/**
 * Typing into the currency ledger search (#444): one query per search, the
 * list marked stale while typing, and no false "nothing has moved" while a
 * cleared search reloads.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider } from "@apollo/client/testing";
import { ApolloLink, Observable } from "@apollo/client";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import {
  CurrencyTransactionKind,
  CurrencyTransactionSource,
} from "../../generated/graphql";
import { CommunityCurrencyLedgerPage } from "../CommunityCurrencyLedgerPage";

const COMMUNITY_ID = "11111111-1111-4111-8111-111111111111";

vi.mock("../../contexts/CommunityHostContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../contexts/CommunityHostContext")
  >("../../contexts/CommunityHostContext");
  return { ...actual, useCommunityId: () => COMMUNITY_ID };
});

const user = {
  __typename: "User" as const,
  id: "u-1",
  username: "member",
  displayName: null,
  avatarImage: null,
};

const currency = {
  __typename: "Currency" as const,
  id: "c-1",
  communityId: COMMUNITY_ID,
  name: "Lantern Coin",
  code: "LNC",
  symbol: null,
  description: null,
  colorId: null,
  isTradeable: true,
  archivedAt: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const mint = {
  __typename: "CurrencyTransaction" as const,
  id: "ct-1",
  currencyId: currency.id,
  userId: user.id,
  kind: CurrencyTransactionKind.Mint,
  amount: 10,
  balanceAfter: 10,
  batchId: null,
  counterpartyId: null,
  actorUserId: user.id,
  actorLabel: null,
  reason: "Lanternfall prompt completion",
  source: CurrencyTransactionSource.Direct,
  sourceId: null,
  staffNote: null,
  createdAt: "2026-10-20T00:00:00.000Z",
  currency,
  user,
  counterparty: null,
  actorUser: user,
};

type Filters = { search?: string; limit: number; offset: number };

/**
 * Answers the ledger slowly enough to be caught mid-load and records the
 * filters each ledger query carried. Unfiltered, it is 60 mints served a page
 * at a time from the offset asked for, so the page size shows in the rows on
 * screen; "zzz" matches nothing, and any other search matches one.
 */
type LedgerOptions = {
  emptyLedger?: boolean;
  /** How long a reply takes, in ms. 100 by default. */
  delay?: (filters: Filters) => number;
};

const recordingLink = (
  sent: Filters[],
  { emptyLedger = false, delay = () => 100 }: LedgerOptions = {},
) =>
  new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        if (operation.operationName === "GetCurrencies") {
          observer.next({ data: { currencies: [currency] } });
          observer.complete();
          return;
        }
        const { filters } = operation.variables as { filters: Filters };
        sent.push(filters);
        const matching = emptyLedger || filters.search === "zzz" ? 0 : 60;
        const count = filters.search ? Math.min(matching, 1) : matching;
        const end = Math.min(count, filters.offset + filters.limit);
        const timer = setTimeout(() => {
          observer.next({
            data: {
              currencyTransactions: {
                __typename: "CurrencyTransactionConnection",
                transactions: Array.from(
                  { length: Math.max(0, end - filters.offset) },
                  (_, i) => ({ ...mint, id: `ct-${filters.offset + i}` }),
                ),
                hasMore: end < count,
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
          <CommunityCurrencyLedgerPage />
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>,
  );

const searchBox = () =>
  screen.getByRole("textbox", { name: "Search the currency ledger" });

const searches = (sent: Filters[]) => sent.map((f) => f.search);

describe("CommunityCurrencyLedgerPage footer", () => {
  it("offers Load more without a total", async () => {
    // The total cost a count over the whole ledger on every request (#444).
    renderLedger([]);
    await screen.findByTestId("currency-ledger-list");

    expect(
      screen.getByRole("button", { name: "Load more" }),
    ).toBeInTheDocument();
  });
});

describe("CommunityCurrencyLedgerPage search", () => {
  it("queries once after Load more, without refetching the old search", async () => {
    const sent: Filters[] = [];
    renderLedger(sent);
    await screen.findByTestId("currency-ledger-list");

    await userEvent.click(screen.getByRole("button", { name: /Load more/ }));
    await waitFor(() => expect(sent).toHaveLength(2));

    await userEvent.type(searchBox(), "Lanternfall", { delay: 30 });

    await waitFor(() => expect(searches(sent)).toContain("Lanternfall"));
    expect(
      sent.map(({ search, limit, offset }) => ({ search, limit, offset })),
    ).toEqual([
      { search: undefined, limit: 25, offset: 0 },
      { search: undefined, limit: 25, offset: 25 },
      { search: "Lanternfall", limit: 25, offset: 0 },
    ]);
  });

  it("drops a page that lands after the filter it was for has changed", async () => {
    const sent: Filters[] = [];
    renderLedger(sent, { delay: (f) => (f.offset > 0 ? 600 : 100) });
    await screen.findByTestId("currency-ledger-list");

    await userEvent.click(screen.getByRole("button", { name: /Load more/ }));
    await userEvent.click(
      screen.getByTestId(`kind-chip-${CurrencyTransactionKind.Mint}`),
    );

    await waitFor(() => expect(sent).toHaveLength(3));
    // Past the old page's arrival.
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(screen.getAllByTestId("currency-ledger-row")).toHaveLength(25);
  });

  it("adds the next page below the first, and the one after", async () => {
    const sent: Filters[] = [];
    renderLedger(sent);
    await screen.findByTestId("currency-ledger-list");

    await userEvent.click(screen.getByRole("button", { name: /Load more/ }));
    await waitFor(() =>
      expect(screen.getAllByTestId("currency-ledger-row")).toHaveLength(50),
    );
    await userEvent.click(screen.getByRole("button", { name: /Load more/ }));
    await waitFor(() =>
      expect(screen.getAllByTestId("currency-ledger-row")).toHaveLength(60),
    );

    expect(sent.map((f) => [f.limit, f.offset])).toEqual([
      [25, 0],
      [25, 25],
      [25, 50],
    ]);
    expect(screen.queryByRole("button", { name: /Load more/ })).toBeNull();
  });

  it("marks the list stale while typing, before the query is sent", async () => {
    const sent: Filters[] = [];
    renderLedger(sent);
    await screen.findByTestId("currency-ledger-list");

    await userEvent.type(searchBox(), "Lan");

    expect(sent).toHaveLength(1);
    expect(screen.getByTestId("currency-ledger-list")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("does not call the ledger empty while a cleared search reloads", async () => {
    const sent: Filters[] = [];
    renderLedger(sent);
    await screen.findByTestId("currency-ledger-list");

    await userEvent.type(searchBox(), "zzz");
    await screen.findByText("Nothing matches those filters.");

    await userEvent.clear(searchBox());

    expect(screen.queryByText(/No currency has moved/)).toBeNull();
    await screen.findByTestId("currency-ledger-list");
  });

  it("starts from the first page on returning to a search Load more was used on", async () => {
    const sent: Filters[] = [];
    renderLedger(sent);
    await screen.findByTestId("currency-ledger-list");

    await userEvent.click(screen.getByRole("button", { name: /Load more/ }));
    await waitFor(() =>
      expect(screen.getAllByTestId("currency-ledger-row")).toHaveLength(50),
    );

    await userEvent.type(searchBox(), "Lanternfall");
    await waitFor(() =>
      expect(screen.getAllByTestId("currency-ledger-row")).toHaveLength(1),
    );
    await userEvent.clear(searchBox());

    await waitFor(() =>
      expect(
        screen.getAllByTestId("currency-ledger-row").length,
      ).toBeGreaterThan(1),
    );
    expect(screen.getAllByTestId("currency-ledger-row")).toHaveLength(25);
  });

  it("disables Load more while typing, before the new search is sent", async () => {
    const sent: Filters[] = [];
    renderLedger(sent);
    await screen.findByTestId("currency-ledger-list");

    await userEvent.type(searchBox(), "Lan");

    expect(screen.getByRole("button", { name: /Load more/ })).toBeDisabled();
  });

  it("keeps the empty state up while a search after an empty one loads", async () => {
    const sent: Filters[] = [];
    renderLedger(sent);
    await screen.findByTestId("currency-ledger-list");

    await userEvent.type(searchBox(), "zzz");
    await screen.findByText("Nothing matches those filters.");

    await userEvent.clear(searchBox());
    await userEvent.type(searchBox(), "Lantern");
    await waitFor(() => expect(searches(sent)).toContain("Lantern"));

    // In flight now. The empty state dims in place rather than giving way to
    // a bare spinner and back.
    expect(screen.getByTestId("currency-ledger-empty")).toBeInTheDocument();
  });

  it("calls an empty ledger empty when the search is only spaces", async () => {
    const sent: Filters[] = [];
    renderLedger(sent, { emptyLedger: true });
    await screen.findByText(/No currency has moved/);

    await userEvent.type(searchBox(), " ");

    // Past the debounce: a blank search is no search, so the verdict must not
    // change to "no match".
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(screen.getByText(/No currency has moved/)).toBeInTheDocument();
  });
});
