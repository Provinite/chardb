import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { Receipt, Undo2, Search, X } from "lucide-react";
import { Button } from "@chardb/ui";
import { toast } from "react-hot-toast";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useUserCommunityRole } from "../hooks/useUserCommunityRole";
import { useCommunityId } from "../contexts/CommunityHostContext";
import {
  useGetCommunityShopPurchasesQuery,
  useRefundShopPurchaseLineMutation,
} from "../generated/graphql";
import { formatPrice } from "../lib/currencyDisplay";

/**
 * What the community has bought, for staff.
 *
 * The buyer's own undo lasts fifteen minutes; anything past that is a staff
 * decision, and until this page existed the docs told members to "ask a
 * moderator" who had no button to press.
 *
 * Refunded lines stay listed rather than disappearing. A refund is a thing
 * that happened, and a page that hides them cannot answer "did someone
 * already deal with this?" -- which is the question staff arrive with.
 */

const Container = styled.div`
  max-width: 1000px;
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
  max-width: 66ch;
`;

const Filter = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
`;

const SearchBox = styled.div`
  position: relative;
  flex: 1;
  max-width: 320px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Purchase = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  margin-bottom: 1rem;
  overflow: hidden;
`;

const PurchaseHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: baseline;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
`;

const Buyer = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const When = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Line = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const LineName = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`;

const Muted = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Refunded = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-style: italic;
`;

const Empty = styled.div`
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 2.5rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const CommunityShopPurchasesPage: React.FC = () => {
  const communityId = useCommunityId();
  const { permissions, loading: roleLoading } = useUserCommunityRole(
    communityId ?? undefined,
  );
  const [query, setQuery] = useState("");
  const [busyLineId, setBusyLineId] = useState<string | null>(null);
  /**
   * The refund awaiting a yes.
   *
   * Everything the dialog says is captured here rather than looked up again
   * when it renders: the list refetches, and a dialog that re-read the row
   * could end up naming a different purchase than the one that was clicked.
   */
  const [pending, setPending] = useState<{
    lineId: string;
    item: string;
    buyer: string;
    cost: string;
  } | null>(null);

  const { data, loading, error, refetch } = useGetCommunityShopPurchasesQuery({
    variables: { communityId: communityId as string, limit: 50 },
    skip: !communityId,
    fetchPolicy: "cache-and-network",
  });

  const [refundLine] = useRefundShopPurchaseLineMutation();

  const purchases = useMemo(() => data?.communityShopPurchases ?? [], [data]);

  // Filtered here rather than on the server: fifty purchases is a page, and a
  // round trip per keystroke buys nothing at that size.
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return purchases;
    return purchases.filter((p) => {
      const who = `${p.buyer?.username ?? ""} ${p.buyer?.displayName ?? ""}`;
      const what = p.lines
        .map((l) => l.shopItem.name || l.shopItem.itemType.name)
        .join(" ");
      return `${who} ${what}`.toLowerCase().includes(needle);
    });
  }, [purchases, query]);

  const handleRefund = async (lineId: string, who: string) => {
    setBusyLineId(lineId);
    try {
      await refundLine({ variables: { lineId } });
      toast.success(`Refunded ${who}`);
      await refetch();
    } catch (err) {
      // The server owns every reason a refund can fail -- the item was used,
      // traded, or the buyer has left -- so its message is the useful one.
      toast.error(err instanceof Error ? err.message : "Could not refund that");
    } finally {
      setBusyLineId(null);
      setPending(null);
    }
  };

  if (!communityId) return null;

  // Only before there is anything to show. This query is cache-and-network,
  // which reports loading on every background revalidation too, so a bare
  // `loading` check replaced the whole page with a spinner on every visit.
  if ((loading && !data) || roleLoading) {
    return (
      <Container>
        <LoadingSpinner />
      </Container>
    );
  }

  if (!permissions.canGrantItems) {
    return (
      <Container>
        <Empty>
          Refunding somebody else&apos;s purchase needs permission to grant
          items in this community.
        </Empty>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Empty>{error.message}</Empty>
      </Container>
    );
  }

  return (
    <Container data-testid="shop-purchases-page">
      <Header>
        <Title>
          <Receipt size={28} /> Shop purchases
        </Title>
        <Subtitle>
          The fifty most recent, newest first. Members can undo their own
          purchase for fifteen minutes; after that it is a staff decision, and
          this is where it is made.{" "}
          <Link to="/admin/shop">Manage what is for sale</Link>.
        </Subtitle>
      </Header>

      <Filter>
        <SearchBox>
          <SearchIcon size={16} />
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by member or item…"
            aria-label="Filter purchases"
          />
        </SearchBox>
        {query && (
          <Button variant="secondary" onClick={() => setQuery("")}>
            <X size={14} /> Clear
          </Button>
        )}
      </Filter>

      {shown.length === 0 ? (
        <Empty>
          {purchases.length === 0
            ? "Nothing has been bought here yet."
            : "No purchase matches that."}
        </Empty>
      ) : (
        shown.map((purchase) => (
          <Purchase key={purchase.id} data-testid={`purchase-${purchase.id}`}>
            <PurchaseHead>
              <Buyer>
                <Link to={`/user/${purchase.buyer?.username ?? ""}`}>
                  {purchase.buyer?.displayName ||
                    `@${purchase.buyer?.username ?? "someone"}`}
                </Link>
              </Buyer>
              <When>{new Date(purchase.createdAt).toLocaleString()}</When>
            </PurchaseHead>

            {purchase.lines.map((line) => (
              <Line key={line.id}>
                <LineName>
                  <span>
                    {line.shopItem.name || line.shopItem.itemType.name}
                  </span>
                  <Muted>{formatPrice(line.costs)}</Muted>
                </LineName>

                {line.refundedAt ? (
                  <Refunded>
                    Refunded
                    {line.refundedBy ? ` by @${line.refundedBy.username}` : ""}
                  </Refunded>
                ) : line.refundableByViewer ? (
                  <Button
                    variant="secondary"
                    disabled={busyLineId === line.id}
                    data-testid={`staff-refund-${line.id}`}
                    onClick={() =>
                      setPending({
                        lineId: line.id,
                        item: line.shopItem.name || line.shopItem.itemType.name,
                        buyer:
                          purchase.buyer?.displayName ||
                          `@${purchase.buyer?.username ?? "someone"}`,
                        cost: formatPrice(line.costs),
                      })
                    }
                  >
                    <Undo2 size={14} />{" "}
                    {busyLineId === line.id ? "Refunding…" : "Refund"}
                  </Button>
                ) : (
                  // Why not, rather than a disabled button with no
                  // explanation. The reasons are things staff cannot fix --
                  // the item was used, traded, or the buyer has left.
                  <Refunded>{line.refundBlockedReason}</Refunded>
                )}
              </Line>
            ))}
          </Purchase>
        ))
      )}

      {/* A staff refund is irreversible the moment it lands -- it returns the
          coin and destroys the item, and there is no un-refund -- so it never
          happens on a single click. The buyer's own undo, one screen over,
          has had this gate since it shipped. Naming the member and the item
          matters here in a way it does not there: this page lists many
          people's purchases and the rows look alike. */}
      <ConfirmDialog
        open={pending !== null}
        destructive
        title={
          pending ? `Refund ${pending.item} to ${pending.buyer}?` : "Refund?"
        }
        confirmLabel="Refund"
        busyLabel="Refunding…"
        busy={busyLineId !== null}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) void handleRefund(pending.lineId, pending.buyer);
        }}
        testId="staff-refund-dialog"
      >
        {pending && (
          <>
            This returns <strong>{pending.cost}</strong> and destroys the item.
            It cannot be undone.
          </>
        )}
      </ConfirmDialog>
    </Container>
  );
};

export default CommunityShopPurchasesPage;
