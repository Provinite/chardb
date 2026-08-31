import React, { useMemo, useState } from "react";
import styled, { css } from "styled-components";
import { useParams, Link } from "react-router-dom";
import { Package, Search, Lock } from "lucide-react";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  ItemTransactionKind,
  useCommunityByIdQuery,
  useGetItemTransactionsQuery,
  type ItemTransactionFieldsFragment,
} from "../generated/graphql";
import { collapseByBatch, KIND_LABEL, kindTone } from "../lib/itemDisplay";

/**
 * The item ledger: every movement of every item in one community.
 *
 * Readable by any member, not just staff — provenance is public so it can act
 * as a trust signal. Staff notes are the one exception; the server nulls them
 * for viewers without item permissions, so this page just renders whatever
 * came back rather than gating anything itself.
 */

const PAGE_SIZE = 25;

/** Order matters: this is the order the filter chips render in. */
const KINDS: ReadonlyArray<{ kind: ItemTransactionKind; label: string }> = [
  { kind: ItemTransactionKind.Grant, label: "Granted" },
  { kind: ItemTransactionKind.Revoke, label: "Revoked" },
  { kind: ItemTransactionKind.Transfer, label: "Traded" },
  { kind: ItemTransactionKind.Claim, label: "Claimed" },
  { kind: ItemTransactionKind.Use, label: "Used" },
  { kind: ItemTransactionKind.Import, label: "Imported" },
];

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1.25rem;
`;

const SearchWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 220px;

  svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.text.muted};
    pointer-events: none;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  font: inherit;
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

const Chip = styled.button<{ $active: boolean }>`
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.3rem 0.75rem;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.secondary};
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${theme.colors.primary}1a;
      border-color: ${theme.colors.primary}55;
      color: ${theme.colors.primary};
      font-weight: 600;
    `}
`;

const TableWrap = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow-x: auto;
  background: ${({ theme }) => theme.colors.background};
`;

const Table = styled.table`
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  font-size: 0.875rem;

  th {
    text-align: left;
    font-size: 0.6875rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.text.muted};
    font-weight: 600;
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    white-space: nowrap;
  }

  td {
    padding: 0.7rem 0.75rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    vertical-align: middle;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  tbody tr:hover {
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const When = styled.td`
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.8125rem;
`;

const KindPill = styled.span<{ $tone: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  padding: 0.1rem 0.55rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;

  ${({ $tone, theme }) => {
    const color =
      $tone === "success"
        ? theme.colors.success
        : $tone === "danger"
          ? theme.colors.danger
          : $tone === "info"
            ? theme.colors.info
            : $tone === "warning"
              ? theme.colors.warning
              : theme.colors.text.muted;
    return css`
      color: ${color};
      background: ${color}22;
    `;
  }}

  &::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
`;

const ItemCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
`;

const Swatch = styled.div<{ $hex?: string | null }>`
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  flex: none;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme, $hex }) =>
    $hex ? `${$hex}22` : theme.colors.surface};
  color: ${({ theme, $hex }) => $hex || theme.colors.text.muted};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ItemName = styled.div`
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemCategory = styled.div`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Delta = styled.td<{ $sign: number }>`
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme, $sign }) =>
    $sign > 0 ? theme.colors.success : theme.colors.danger} !important;
`;

const Party = styled.span`
  font-weight: 500;
  white-space: nowrap;
`;

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Arrow = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0 0.375rem;
`;

const ActorTag = styled.span`
  font-size: 0.625rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid ${({ theme }) => theme.colors.info};
  color: ${({ theme }) => theme.colors.info};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  padding: 0 0.25rem;
  margin-left: 0.375rem;
`;

const Reason = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.8125rem;
`;

const StaffNote = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.3rem;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.muted};

  svg {
    flex: none;
    margin-top: 0.15rem;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Empty = styled.div`
  padding: 3rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
`;

const Count = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-variant-numeric: tabular-nums;
`;

const MoreButton = styled.button`
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.45rem 0.9rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

/** Which way the count reads for this kind of event. */
const signFor = (kind: ItemTransactionKind) =>
  kind === ItemTransactionKind.Revoke || kind === ItemTransactionKind.Use
    ? -1
    : 1;

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const displayName = (
  user: { username: string; displayName?: string | null } | null | undefined,
) => user?.displayName || user?.username || null;

/**
 * Who it moved between, phrased per kind.
 *
 * A grant has no source and a revoke has no destination, so rendering the raw
 * from/to pair would print a bare dash and leave the reader to work out which
 * side is missing and why.
 */
const PartyCell: React.FC<{
  row: ItemTransactionFieldsFragment;
  communityId?: string;
}> = ({ row, communityId }) => {
  const from = displayName(row.fromUser);
  const to = displayName(row.toUser);

  // A name in the ledger is the natural way into that person's holdings --
  // the members page is still a placeholder, so this is the only route in.
  const who = (label: string, u: ItemTransactionFieldsFragment["toUser"]) =>
    communityId && u ? (
      <Party>
        <Link to={`/communities/${communityId}/members/${u.username}/items`}>
          {label}
        </Link>
      </Party>
    ) : (
      <Party>{label}</Party>
    );

  switch (row.kind) {
    case ItemTransactionKind.Grant:
      return (
        <>
          <Muted>—</Muted>
          <Arrow>→</Arrow>
          {to ? who(to, row.toUser) : <Muted>pending claim</Muted>}
        </>
      );
    case ItemTransactionKind.Revoke:
      return (
        <>
          {from ? who(from, row.fromUser) : <Muted>—</Muted>}
          <Arrow>→</Arrow>
          <Muted>destroyed</Muted>
        </>
      );
    case ItemTransactionKind.Use:
      return (
        <>
          {from ? who(from, row.fromUser) : <Muted>—</Muted>}
          <Arrow>→</Arrow>
          <Muted>consumed</Muted>
        </>
      );
    case ItemTransactionKind.Claim:
      return (
        <>
          <Muted>pending</Muted>
          <Arrow>→</Arrow>
          {to ? who(to, row.toUser) : <Muted>—</Muted>}
        </>
      );
    case ItemTransactionKind.Import:
      // These items predate the ledger. Their real origin was never recorded,
      // and saying "unrecorded" is more honest than a bare dash that reads
      // like a grant from nobody.
      return (
        <>
          <Muted>unrecorded</Muted>
          <Arrow>→</Arrow>
          {to ? who(to, row.toUser) : <Muted>—</Muted>}
        </>
      );
    default:
      return (
        <>
          {from ? <Party>{from}</Party> : <Muted>—</Muted>}
          <Arrow>→</Arrow>
          {to ? who(to, row.toUser) : <Muted>—</Muted>}
        </>
      );
  }
};

export const CommunityItemLedgerPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const [search, setSearch] = useState("");
  const [activeKinds, setActiveKinds] = useState<ItemTransactionKind[]>([]);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: communityData } = useCommunityByIdQuery({
    variables: { id: communityId! },
    skip: !communityId,
  });

  const filters = useMemo(
    () => ({
      communityId: communityId!,
      limit,
      offset: 0,
      kinds: activeKinds.length ? activeKinds : undefined,
      search: search.trim() || undefined,
    }),
    [communityId, limit, activeKinds, search],
  );

  const { data, loading, error } = useGetItemTransactionsQuery({
    variables: { filters },
    skip: !communityId,
    // Keeps the previous page on screen while a filter change is in flight,
    // instead of flashing the empty state between every keystroke.
    fetchPolicy: "cache-and-network",
  });

  const toggleKind = (kind: ItemTransactionKind) => {
    setLimit(PAGE_SIZE);
    setActiveKinds((current) =>
      current.includes(kind)
        ? current.filter((k) => k !== kind)
        : [...current, kind],
    );
  };

  const rows = data?.itemTransactions?.transactions ?? [];
  const entries = collapseByBatch(rows);
  const total = data?.itemTransactions?.total ?? 0;
  const hasMore = data?.itemTransactions?.hasMore ?? false;

  if (loading && !data) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Item Ledger</Title>
        <Subtitle>
          Every item movement in{" "}
          {communityData?.community?.name || "this community"}
        </Subtitle>
      </Header>

      <Toolbar>
        <SearchWrap>
          <Search size={15} />
          <SearchInput
            type="search"
            aria-label="Search the ledger"
            placeholder="Search item, member, or reason…"
            value={search}
            onChange={(e) => {
              setLimit(PAGE_SIZE);
              setSearch(e.target.value);
            }}
          />
        </SearchWrap>
        <Chips>
          {KINDS.map(({ kind, label }) => (
            <Chip
              key={kind}
              type="button"
              aria-pressed={activeKinds.includes(kind)}
              $active={activeKinds.includes(kind)}
              onClick={() => toggleKind(kind)}
            >
              {label}
            </Chip>
          ))}
        </Chips>
      </Toolbar>

      {error ? (
        <Empty>
          <p>That ledger could not be loaded. {error.message}</p>
        </Empty>
      ) : entries.length === 0 ? (
        <Empty>
          <Package
            size={36}
            style={{ opacity: 0.5, marginBottom: "0.75rem" }}
          />
          <p>
            {search || activeKinds.length
              ? "No events match those filters."
              : "Nothing has moved yet. Granting an item will record the first event here."}
          </p>
        </Empty>
      ) : (
        <>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Event</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>From → To</th>
                  <th>By</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(({ row, count, key }) => {
                  const actor =
                    displayName(row.actorUser) || row.actorLabel || "—";
                  const isBot = !row.actorUser && !!row.actorLabel;
                  const sign = signFor(row.kind);
                  return (
                    <tr key={key} data-testid="ledger-row">
                      <When>{formatWhen(row.createdAt)}</When>
                      <td>
                        <KindPill $tone={kindTone(row.kind)}>
                          {KIND_LABEL[row.kind]}
                        </KindPill>
                      </td>
                      <td>
                        <ItemCell>
                          <Swatch $hex={row.itemType.color?.hexCode}>
                            {row.itemType.image ? (
                              <img
                                src={
                                  row.itemType.image.thumbnailUrl ||
                                  row.itemType.image.originalUrl
                                }
                                alt={
                                  row.itemType.image.altText ||
                                  row.itemType.name
                                }
                              />
                            ) : (
                              <Package size={15} />
                            )}
                          </Swatch>
                          <div>
                            <ItemName>
                              {/* A collapsed batch covers several items, which
                                  do not share a history -- only a row standing
                                  for one item can link to it. */}
                              <Link
                                to={
                                  count === 1 && row.itemId
                                    ? `/communities/${communityId}/items/${row.itemId}`
                                    : `/item-types/${row.itemType.id}`
                                }
                              >
                                {row.itemType.name}
                              </Link>
                            </ItemName>
                            {row.itemType.category && (
                              <ItemCategory>
                                {row.itemType.category}
                              </ItemCategory>
                            )}
                          </div>
                        </ItemCell>
                      </td>
                      <Delta $sign={sign}>
                        {sign > 0 ? "+" : "−"}
                        {count}
                      </Delta>
                      <td>
                        <PartyCell row={row} communityId={communityId} />
                      </td>
                      <td>
                        <Party>{actor}</Party>
                        {isBot && <ActorTag>bot</ActorTag>}
                      </td>
                      <td>
                        <Reason>{row.reason || <Muted>—</Muted>}</Reason>
                        {row.staffNote && (
                          <StaffNote>
                            <Lock size={11} />
                            <span>{row.staffNote}</span>
                          </StaffNote>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>

          <Footer>
            <Count>
              Showing {entries.length} event{entries.length === 1 ? "" : "s"}{" "}
              across {rows.length} of {total} item movement
              {total === 1 ? "" : "s"}
            </Count>
            {hasMore && (
              <MoreButton
                type="button"
                disabled={loading}
                onClick={() => setLimit((n) => n + PAGE_SIZE)}
              >
                {loading ? "Loading…" : "Load more"}
              </MoreButton>
            )}
          </Footer>
        </>
      )}
    </Container>
  );
};
