import React, { useState } from "react";
import styled from "styled-components";
import { useParams, Link } from "react-router-dom";
import { Receipt, Undo2, Search, X, Check } from "lucide-react";
import { Button } from "@chardb/ui";
import { toast } from "react-hot-toast";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  useGetMyShopPurchaseLinesQuery,
  useRefundShopPurchaseLineMutation,
  ShopPurchaseLineStatus,
} from "../generated/graphql";
import { formatPrice } from "../lib/currencyDisplay";

/**
 * Everything the viewer has bought here.
 *
 * The shop's sidebar panel shows the eight most recent, which is the right
 * size for something sitting next to a cart and the wrong size for the only
 * view a buyer had: past eight, purchases were unreachable, so somebody who
 * bought ten and then ten more could neither see nor undo the first ten (#289).
 *
 * Lines rather than baskets. "I bought ten things" is what a buyer counts, and
 * a basket holding one refunded line and two live ones is not a thing a filter
 * can answer about.
 *
 * Searching and filtering happen on the server. Doing them here would answer
 * about the page rather than the history, which is the same mistake in a
 * smaller hat.
 */

const PAGE_SIZE = 25;

const Container = styled.div`
  max-width: 900px;
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
  flex: 1 1 260px;

  input {
    width: 100%;
    padding: 0.55rem 2rem 0.55rem 2.1rem;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 8px;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: 0.9375rem;

    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.colors.primary};
    }
  }

  svg:first-child {
    position: absolute;
    left: 0.6rem;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const ClearSearch = styled.button`
  position: absolute;
  right: 0.4rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  padding: 0.2rem;
`;

const Chips = styled.div`
  display: flex;
  gap: 0.4rem;
`;

const Chip = styled.button<{ $active: boolean }>`
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active }) =>
    $active ? `${theme.colors.primary}18` : "transparent"};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font-size: 0.8125rem;
  cursor: pointer;
`;

const List = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
`;

const Row = styled.div<{ $refunded: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  opacity: ${({ $refunded }) => ($refunded ? 0.6 : 1)};

  &:last-child {
    border-bottom: none;
  }
`;

const What = styled.div`
  min-width: 0;
  flex: 1;
`;

const Name = styled.div`
  font-weight: 600;
  font-size: 0.9375rem;
`;

const Meta = styled.div`
  margin-top: 0.15rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const UndoButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.8125rem;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.8125rem;
  white-space: nowrap;
`;

const Empty = styled.div`
  padding: 3rem 1.5rem;
  text-align: center;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Footer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1.25rem;
`;

const STATUS_CHIPS: Array<{
  label: string;
  value: ShopPurchaseLineStatus | undefined;
}> = [
  { label: "All", value: undefined },
  { label: "Active", value: ShopPurchaseLineStatus.Active },
  { label: "Refunded", value: ShopPurchaseLineStatus.Refunded },
];

export const CommunityShopMyPurchasesPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ShopPurchaseLineStatus | undefined>();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [busyLineId, setBusyLineId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useGetMyShopPurchaseLinesQuery({
    variables: {
      filters: {
        communityId: communityId as string,
        search: search.trim() || undefined,
        status,
        limit,
      },
    },
    skip: !communityId,
    fetchPolicy: "cache-and-network",
  });

  const [refundLine] = useRefundShopPurchaseLineMutation();
  /**
   * The purchase awaiting a yes on Undo. Captured rather than re-read when the
   * dialog renders, since the list refetches underneath it.
   */
  const [undoTarget, setUndoTarget] = useState<{
    lineId: string;
    item: string;
    cost: string;
  } | null>(null);

  const lines = data?.myShopPurchaseLines.lines ?? [];
  const total = data?.myShopPurchaseLines.total ?? 0;
  const hasMore = data?.myShopPurchaseLines.hasMore ?? false;
  const filtering = Boolean(search.trim()) || status !== undefined;

  const handleUndo = async (lineId: string) => {
    setBusyLineId(lineId);
    try {
      await refundLine({ variables: { lineId } });
      toast.success("Refunded");
      await refetch();
    } catch (err) {
      // Every reason a refund can fail -- the window passed, the item was
      // used or traded -- is the server's to know, so its message is the
      // useful one.
      toast.error(err instanceof Error ? err.message : "Could not undo that");
    } finally {
      setBusyLineId(null);
      setUndoTarget(null);
    }
  };

  if (!communityId) return null;

  // Only before there is anything to show. This query is cache-and-network,
  // so a bare `loading` check would replace the list with a spinner on every
  // keystroke and every background revalidation.
  if (loading && !data) {
    return (
      <Container>
        <LoadingSpinner />
      </Container>
    );
  }

  return (
    <Container data-testid="my-shop-purchases-page">
      <Header>
        <Title>
          <Receipt size={28} /> Your purchases
        </Title>
        <Subtitle>
          Everything you have bought here, newest first. You can undo a purchase
          for fifteen minutes; after that it is a staff decision, and each row
          says which it is.{" "}
          <Link to={`/communities/${communityId}/shop`}>Back to the shop</Link>
        </Subtitle>
      </Header>

      <Controls>
        <SearchBox>
          <Search size={15} />
          <input
            value={search}
            placeholder="Search by item"
            aria-label="Search your purchases"
            data-testid="purchase-search"
            onChange={(e) => {
              setSearch(e.target.value);
              // A narrowed list starts at its own beginning; keeping the
              // grown page size would ask for rows the filter may not have.
              setLimit(PAGE_SIZE);
            }}
          />
          {search && (
            <ClearSearch
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearch("");
                setLimit(PAGE_SIZE);
              }}
            >
              <X size={14} />
            </ClearSearch>
          )}
        </SearchBox>

        <Chips>
          {STATUS_CHIPS.map((chip) => (
            <Chip
              key={chip.label}
              type="button"
              $active={status === chip.value}
              data-testid={`status-chip-${chip.label}`}
              onClick={() => {
                setStatus(chip.value);
                setLimit(PAGE_SIZE);
              }}
            >
              {chip.label}
            </Chip>
          ))}
        </Chips>
      </Controls>

      {error ? (
        <Empty>{error.message}</Empty>
      ) : lines.length === 0 ? (
        <Empty data-testid="my-purchases-empty">
          {filtering
            ? "Nothing matches that."
            : "You have not bought anything here yet."}
        </Empty>
      ) : (
        <>
          <List data-testid="my-purchases-list">
            {lines.map((line) => (
              <Row
                key={line.id}
                $refunded={Boolean(line.refundedAt)}
                data-testid={`my-purchase-${line.id}`}
              >
                <What>
                  <Name>
                    {line.shopItem.name || line.shopItem.itemType.name}
                  </Name>
                  <Meta>
                    {formatPrice(line.costs)} ·{" "}
                    {new Date(line.purchasedAt).toLocaleDateString()}
                    {line.refundedAt ? " · refunded" : ""}
                  </Meta>
                </What>
                {line.refundableByViewer ? (
                  <UndoButton
                    onClick={() =>
                      setUndoTarget({
                        lineId: line.id,
                        item: line.shopItem.name || line.shopItem.itemType.name,
                        cost: formatPrice(line.costs),
                      })
                    }
                    disabled={busyLineId === line.id}
                    data-testid={`my-undo-${line.id}`}
                  >
                    <Undo2 size={13} /> Undo
                  </UndoButton>
                ) : (
                  // Said rather than left blank: the difference between "this
                  // is too old" and "this is already refunded" is exactly what
                  // the reporter could not tell.
                  <Muted title={line.refundBlockedReason ?? undefined}>
                    {line.refundedAt ? (
                      <>
                        <Check size={13} /> Refunded
                      </>
                    ) : (
                      (line.refundBlockedReason ?? "—")
                    )}
                  </Muted>
                )}
              </Row>
            ))}
          </List>

          <Footer>
            <Muted data-testid="my-purchases-count">
              Showing {lines.length} of {total}
            </Muted>
            {hasMore && (
              <Button
                variant="secondary"
                onClick={() => setLimit((n) => n + PAGE_SIZE)}
              >
                Load more
              </Button>
            )}
          </Footer>
        </>
      )}

      {/* The same gate the shop sidebar's Undo has. Two buttons doing the
          same irreversible thing, one asking and one not, is how the staff
          refund ended up without one. */}
      <ConfirmDialog
        open={undoTarget !== null}
        title={undoTarget ? `Undo buying ${undoTarget.item}?` : "Undo?"}
        confirmLabel="Undo it"
        busyLabel="Undoing…"
        busy={busyLineId !== null}
        onCancel={() => setUndoTarget(null)}
        onConfirm={() => {
          if (undoTarget) void handleUndo(undoTarget.lineId);
        }}
        testId="my-undo-dialog"
      >
        {undoTarget && (
          <>
            This returns <strong>{undoTarget.cost}</strong> and takes the item
            back. If it is limited, someone else may buy it before you can.
          </>
        )}
      </ConfirmDialog>
    </Container>
  );
};
