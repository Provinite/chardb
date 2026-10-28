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

type Filters = { search?: string; limit: number };

/**
 * Answers the ledger slowly enough to be caught mid-load and records the
 * filters each ledger query carried. "zzz" matches nothing; anything else
 * returns the one mint, with more to load when unfiltered.
 */
const recordingLink = (sent: Filters[]) =>
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
        const empty = filters.search === "zzz";
        const timer = setTimeout(() => {
          observer.next({
            data: {
              currencyTransactions: {
                __typename: "CurrencyTransactionConnection",
                transactions: empty ? [] : [mint],
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

const renderLedger = (sent: Filters[]) =>
  render(
    <MockedProvider link={recordingLink(sent)}>
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

describe("CommunityCurrencyLedgerPage search", () => {
  it("queries once after Load more, without refetching the old search", async () => {
    const sent: Filters[] = [];
    renderLedger(sent);
    await screen.findByTestId("currency-ledger-list");

    await userEvent.click(screen.getByRole("button", { name: /Load more/ }));
    await waitFor(() => expect(sent).toHaveLength(2));

    await userEvent.type(searchBox(), "Lanternfall", { delay: 30 });

    await waitFor(() => expect(searches(sent)).toContain("Lanternfall"));
    expect(sent.map(({ search, limit }) => ({ search, limit }))).toEqual([
      { search: undefined, limit: 25 },
      { search: undefined, limit: 50 },
      { search: "Lanternfall", limit: 25 },
    ]);
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
});
