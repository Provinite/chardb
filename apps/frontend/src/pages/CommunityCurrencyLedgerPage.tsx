import React, { useMemo, useState } from "react";
import styled, { css } from "styled-components";
import { useSearchParams, Link } from "react-router-dom";
import { Coins, Search } from "lucide-react";
import { Button } from "@chardb/ui";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useCommunityId } from "../contexts/CommunityHostContext";
import { apexUrl } from "../lib/communityHost";
import {
  useGetCurrencyTransactionsQuery,
  useGetCurrenciesQuery,
  CurrencyTransactionKind,
  CurrencyTransactionSource,
  type CurrencyTransactionFieldsFragment,
} from "../generated/graphql";
import {
  CURRENCY_KIND_LABEL,
  formatDelta,
  currencyTone,
  collapseTransferLegs,
  type CurrencyTone,
} from "../lib/currencyDisplay";

/**
 * Every currency movement in a community, newest first.
 *
 * Readable by any member, like the item ledger and for the same reason: an
 * economy nobody can inspect cannot be argued with. Staff notes are the one
 * exception, and the server decides who sees them — this page renders whatever
 * it is given.
 *
 * A transfer writes two rows so each member's own statement reads correctly.
 * Here both legs are visible at once, so they are collapsed into one line:
 * showing them separately would make one movement of coin look like two.
 */

const Container = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  margin-bottom: 1.5rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
  max-width: 65ch;
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1.25rem;
`;

const SearchBox = styled.div`
  position: relative;
  flex: 1 1 240px;

  svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.625rem 0.75rem 0.625rem 2.25rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Select = styled.select`
  padding: 0.625rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const Chip = styled.button<{ $active: boolean }>`
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.surface};
  color: ${({ theme, $active }) =>
    $active ? "#fff" : theme.colors.text.primary};
`;

const List = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
`;

const Entry = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  padding: 0.875rem 1.125rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const EntryMain = styled.div`
  min-width: 0;
`;

const EntryHeadline = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
`;

const KindTag = styled.span<{ $tone: CurrencyTone }>`
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  ${({ $tone, theme }) => {
    if ($tone === "positive") {
      return css`
        background: ${theme.colors.success}22;
        color: ${theme.colors.success};
      `;
    }
    if ($tone === "negative") {
      return css`
        background: ${theme.colors.error}22;
        color: ${theme.colors.error};
      `;
    }
    return css`
      background: ${theme.colors.border};
      color: ${theme.colors.text.muted};
    `;
  }}
`;

const Reason = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
  margin-top: 0.25rem;
`;

const StaffNote = styled.div`
  margin-top: 0.4rem;
  padding: 0.4rem 0.6rem;
  border-left: 3px solid ${({ theme }) => theme.colors.warning};
  background: ${({ theme }) => theme.colors.background};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const StaffLabel = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.warning};
  margin-right: 0.35rem;
`;

const sourceLink = css`
  display: inline-block;
  margin-top: 0.3rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.primary};
`;

const SourceLink = styled(Link)`
  ${sourceLink}
`;

/** The same link when it leaves this host; see the media row below. */
const SourceAnchor = styled.a`
  ${sourceLink}
`;

const EntrySide = styled.div`
  text-align: right;
  white-space: nowrap;
`;

const Delta = styled.div<{ $tone: CurrencyTone }>`
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ $tone, theme }) =>
    $tone === "positive"
      ? theme.colors.success
      : $tone === "negative"
        ? theme.colors.error
        : theme.colors.text.primary};
`;

const Timestamp = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: 0.2rem;
`;

const Empty = styled.div`
  text-align: center;
  padding: 3rem 1.5rem;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Footer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 1.25rem;
`;

const PAGE_SIZE = 25;

const KIND_ORDER: CurrencyTransactionKind[] = [
  CurrencyTransactionKind.Mint,
  CurrencyTransactionKind.Transfer,
  CurrencyTransactionKind.Spend,
  CurrencyTransactionKind.Burn,
  CurrencyTransactionKind.Import,
];

/**
 * Phrase a row for a community-wide reader.
 *
 * Deliberately different from a member's own statement. Here nobody is "you",
 * so a transfer reads as a movement between two named people rather than as
 * something sent or received.
 */
function describeForCommunity(row: CurrencyTransactionFieldsFragment): {
  who: React.ReactNode;
  communityId?: string;
} {
  const name = (user?: { username: string } | null) =>
    user ? `@${user.username}` : "someone";

  switch (row.kind) {
    case CurrencyTransactionKind.Transfer: {
      // Both legs carry both parties, so either one can be phrased whole. The
      // sending side is the one that survives collapsing, but a positive row
      // may be the survivor if it came back first.
      const sender = row.amount < 0 ? row.user : row.counterparty;
      const recipient = row.amount < 0 ? row.counterparty : row.user;
      return { who: `${name(sender)} → ${name(recipient)}` };
    }
    case CurrencyTransactionKind.Mint: {
      // A member undoing their own purchase is the actor and the recipient of
      // the refund, and "@member → @member" reads as a transfer to yourself.
      // The reason already says what happened, so the arrow is dropped.
      if (row.actorUser && row.actorUser.username === row.user?.username) {
        return { who: name(row.user) };
      }
      return {
        who: `${name(row.actorUser) === "someone" ? (row.actorLabel ?? "the system") : name(row.actorUser)} → ${name(row.user)}`,
      };
    }
    case CurrencyTransactionKind.Burn:
      return {
        who: `${name(row.user)}, removed by ${name(row.actorUser) === "someone" ? (row.actorLabel ?? "the system") : name(row.actorUser)}`,
      };
    case CurrencyTransactionKind.Spend:
      return { who: `${name(row.user)} spent` };
    default:
      return { who: name(row.user) };
  }
}

export const CommunityCurrencyLedgerPage: React.FC = () => {
  const communityId = useCommunityId();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [kinds, setKinds] = useState<CurrencyTransactionKind[]>([]);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const currencyId = searchParams.get("currencyId") ?? undefined;

  const { data: currencyData } = useGetCurrenciesQuery({
    variables: { communityId: communityId as string, includeArchived: true },
    skip: !communityId,
  });

  const { data, loading, error } = useGetCurrencyTransactionsQuery({
    variables: {
      filters: {
        communityId: communityId as string,
        limit,
        offset: 0,
        kinds: kinds.length > 0 ? kinds : undefined,
        currencyId,
        search: search.trim() || undefined,
      },
    },
    skip: !communityId,
  });

  const currencies = currencyData?.currencies ?? [];
  const rows = useMemo(
    () => collapseTransferLegs(data?.currencyTransactions?.transactions ?? []),
    [data],
  );
  const total = data?.currencyTransactions?.total ?? 0;
  const hasMore = data?.currencyTransactions?.hasMore ?? false;

  const toggleKind = (kind: CurrencyTransactionKind) => {
    setLimit(PAGE_SIZE);
    setKinds((current) =>
      current.includes(kind)
        ? current.filter((k) => k !== kind)
        : [...current, kind],
    );
  };

  const chooseCurrency = (id: string) => {
    setLimit(PAGE_SIZE);
    const next = new URLSearchParams(searchParams);
    if (id) {
      next.set("currencyId", id);
    } else {
      next.delete("currencyId");
    }
    setSearchParams(next, { replace: true });
  };

  if (!communityId) {
    return (
      <Container>
        <Empty>This page needs a community in the URL.</Empty>
      </Container>
    );
  }

  return (
    <Container data-testid="currency-ledger-page">
      <Header>
        <Title>
          <Coins size={28} /> Currency ledger
        </Title>
        <Subtitle>
          Every movement of currency in this community. A transfer shows as one
          line, not two. Readable by any member — this is what makes a balance
          something you can check rather than something you have to take on
          trust.
        </Subtitle>
      </Header>

      <Controls>
        <SearchBox>
          <Search size={16} />
          <SearchInput
            aria-label="Search the currency ledger"
            placeholder="Search reasons and currency names…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(PAGE_SIZE);
            }}
          />
        </SearchBox>
        {currencies.length > 1 && (
          <Select
            aria-label="Filter by currency"
            value={currencyId ?? ""}
            onChange={(e) => chooseCurrency(e.target.value)}
          >
            <option value="">All currencies</option>
            {currencies.map((currency) => (
              <option key={currency.id} value={currency.id}>
                {currency.name}
              </option>
            ))}
          </Select>
        )}
        <Chips>
          {KIND_ORDER.map((kind) => (
            <Chip
              key={kind}
              type="button"
              $active={kinds.includes(kind)}
              onClick={() => toggleKind(kind)}
              data-testid={`kind-chip-${kind}`}
            >
              {CURRENCY_KIND_LABEL[kind]}
            </Chip>
          ))}
        </Chips>
      </Controls>

      {loading && rows.length === 0 ? (
        <LoadingSpinner />
      ) : error ? (
        <Empty>Could not load the ledger: {error.message}</Empty>
      ) : rows.length === 0 ? (
        <Empty data-testid="currency-ledger-empty">
          {kinds.length > 0 || search || currencyId
            ? "Nothing matches those filters."
            : "No currency has moved in this community yet."}
        </Empty>
      ) : (
        <>
          <List data-testid="currency-ledger-list">
            {rows.map((row) => {
              const tone =
                row.kind === CurrencyTransactionKind.Transfer
                  ? "neutral"
                  : currencyTone(row.amount);
              const { who } = describeForCommunity(row);
              return (
                <Entry key={row.id} data-testid="currency-ledger-row">
                  <EntryMain>
                    <EntryHeadline>
                      <KindTag $tone={tone}>
                        {CURRENCY_KIND_LABEL[row.kind]}
                      </KindTag>
                      <strong>{who}</strong>
                      <Link
                        to={`/currencies/ledger?currencyId=${row.currencyId}`}
                      >
                        {row.currency.name}
                      </Link>
                    </EntryHeadline>
                    {row.reason && <Reason>{row.reason}</Reason>}
                    {/* The reason says why in words; this says what, and
                        is clickable. Without it "+25, upload approved" gives
                        a member no way to reach the upload it paid for. The
                        id is a media, which is the thing there is a page
                        for -- an image is an implementation detail of one. */}
                    {row.source === CurrencyTransactionSource.MediaApproval &&
                      row.sourceId && (
                        // Media lives at the apex, not on this community's
                        // host, so the router cannot take us there.
                        <SourceAnchor href={apexUrl(`/media/${row.sourceId}`)}>
                          from an approved upload →
                        </SourceAnchor>
                      )}
                    {/* The item this coin came from, which is destroyed by
                        the time anyone reads this row. Its page survives that
                        on purpose, so the link lands on real provenance --
                        including the USE row on the item ledger carrying the
                        same batch id as this one. Without it, "Used Coin
                        Ticket" names a thing with no way to reach it. */}
                    {row.source === CurrencyTransactionSource.ItemUse &&
                      row.sourceId && (
                        <SourceLink
                          to={`/items/${row.sourceId}`}
                          data-testid="ledger-item-use-link"
                        >
                          from the item that was used →
                        </SourceLink>
                      )}
                    {row.staffNote && (
                      <StaffNote>
                        <StaffLabel>Staff note</StaffLabel>
                        {row.staffNote}
                      </StaffNote>
                    )}
                  </EntryMain>
                  <EntrySide>
                    <Delta $tone={tone}>
                      {row.kind === CurrencyTransactionKind.Transfer
                        ? formatDelta(Math.abs(row.amount), row.currency).slice(
                            1,
                          )
                        : formatDelta(row.amount, row.currency)}
                    </Delta>
                    <Timestamp>
                      {new Date(row.createdAt).toLocaleString()}
                    </Timestamp>
                  </EntrySide>
                </Entry>
              );
            })}
          </List>
          {hasMore && (
            <Footer>
              <Button
                variant="secondary"
                onClick={() => setLimit((current) => current + PAGE_SIZE)}
                disabled={loading}
              >
                {loading ? "Loading…" : `Load more (${total} total)`}
              </Button>
            </Footer>
          )}
        </>
      )}
    </Container>
  );
};
