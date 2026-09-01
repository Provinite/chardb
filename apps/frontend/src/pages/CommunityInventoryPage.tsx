import React, { useState } from "react";
import styled, { css } from "styled-components";
import { useParams, Link } from "react-router-dom";
import { Package, ChevronDown } from "lucide-react";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { CurrencyWallet } from "../components/currency/CurrencyWallet";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-hot-toast";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  useCommunityByIdQuery,
  useGetMemberHoldingsQuery,
  useGetUserProfileQuery,
  useUseItemMutation,
} from "../generated/graphql";

/**
 * What one member holds in one community.
 *
 * One page, three audiences: a member looking at themselves, someone sizing up
 * a trade partner, and staff about to correct something. Inventories are public
 * within a community, so all three see the same thing.
 *
 * There are no staff actions here on purpose. Revoking happens on an item's own
 * page, where its history is in front of you — you should not be able to take
 * something away without first looking at what it is and where it came from.
 * This page's job is to get you there.
 */

const Container = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
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

const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const Tile = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: 0.875rem 1rem;

  .k {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.muted};
  }

  .v {
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.1;
    margin-top: 0.3rem;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Group = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.background};
  overflow: hidden;

  & + & {
    margin-top: 0.75rem;
  }
`;

const GroupHead = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.125rem 1.25rem;
`;

const Swatch = styled.div<{ $hex?: string | null }>`
  width: 48px;
  height: 48px;
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

const GroupInfo = styled.div`
  min-width: 0;
  flex: 1;
`;

const GroupName = styled.div`
  font-weight: 600;
  font-size: 1.0625rem;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.125rem;
`;

const GroupMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Count = styled.span`
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  font-size: 1.25rem;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
`;

const Button = styled.button<{ $danger?: boolean }>`
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  border: 1px solid
    ${({ theme, $danger }) =>
      $danger ? theme.colors.danger : theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme, $danger }) =>
    $danger ? theme.colors.danger : theme.colors.text.secondary};

  &:hover:not(:disabled) {
    background: ${({ theme, $danger }) =>
      $danger ? `${theme.colors.danger}12` : theme.colors.surface};
    color: ${({ theme, $danger }) =>
      $danger ? theme.colors.danger : theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/** Sits inside an item row, so it is smaller than the group-level buttons. */
const UseButton = styled.button`
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  margin-left: 0.35rem;
  padding: 0.3rem 0.6rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primary}12;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Expand = styled(Button)<{ $open: boolean }>`
  svg:last-child {
    transition: transform 0.15s;
    ${({ $open }) =>
      $open &&
      css`
        transform: rotate(180deg);
      `}
  }
`;

const Items = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0 1.25rem 1.125rem 4.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`;

const ItemRow = styled.li`
  a {
    display: inline-flex;
    align-items: baseline;
    gap: 0.4rem;
    padding: 0.35rem 0.7rem;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.borderRadius.md};
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.secondary};

    &:hover {
      background: ${({ theme }) => theme.colors.surface};
      color: ${({ theme }) => theme.colors.text.primary};
      border-color: ${({ theme }) => theme.colors.primary};
    }
  }
`;

const Since = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.6875rem;
`;

const Empty = styled.div`
  padding: 3rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const CommunityInventoryPage: React.FC = () => {
  const { communityId, username } = useParams<{
    communityId: string;
    username?: string;
  }>();
  const { user } = useAuth();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: communityData } = useCommunityByIdQuery({
    variables: { id: communityId! },
    skip: !communityId,
  });

  // No username in the route means "my own", which is the common case and
  // keeps /communities/:id/inventory working as it always has.
  const viewingSelf = !username || username === user?.username;

  // The route names a person, not an id, because that is what a shareable URL
  // should say. One lookup turns it into the id the holdings query needs.
  const { data: profileData, loading: profileLoading } = useGetUserProfileQuery(
    {
      variables: { username: username ?? "" },
      skip: viewingSelf || !username,
    },
  );

  const targetUserId = viewingSelf
    ? user?.id
    : profileData?.userProfile?.user.id;

  const {
    data,
    loading: holdingsLoading,
    error,
  } = useGetMemberHoldingsQuery({
    variables: { communityId: communityId!, userId: targetUserId ?? "" },
    skip: !communityId || !targetUserId,
  });

  const loading = profileLoading || holdingsLoading;

  const report = data?.memberHoldings;
  const holdings = report?.holdings ?? [];

  /**
   * The use awaiting a yes.
   *
   * Using destroys the item, and there is no un-use. Same gate the shop
   * refunds got (#296), and captured up front because the holdings list
   * refetches after a use -- a dialog re-reading the row could name a
   * different item than the one that was clicked.
   */
  const [pendingUse, setPendingUse] = useState<{
    itemId: string;
    itemTypeName: string;
    payout: string;
  } | null>(null);
  const [usingItemId, setUsingItemId] = useState<string | null>(null);
  // Not named `useItem`: a function starting with "use" reads as a hook to
  // eslint, and calling it from handleUse trips rules-of-hooks.
  const [submitUse] = useUseItemMutation();

  const handleUse = async (itemId: string) => {
    setUsingItemId(itemId);
    try {
      const result = await submitUse({
        variables: { input: { itemId } },
        // Both moved: the item is gone and the balance grew. The wallet is a
        // separate component with its own query, so refetching by operation
        // name is what keeps the two halves of one event on screen together.
        refetchQueries: ["GetMemberHoldings", "GetMemberWallet"],
        awaitRefetchQueries: true,
      });
      const paid = result.data?.useItem.payout ?? [];
      toast.success(
        paid.length
          ? `Redeemed. You received ${paid
              .map(
                (p) =>
                  `${p.amount.toLocaleString()} ${
                    p.currency.symbol || p.currency.code
                  }`,
              )
              .join(" + ")}.`
          : "Redeemed.",
      );
    } catch (err) {
      // The server owns every reason a use can fail -- archived currency, the
      // item already gone, no longer a member -- so its message is the useful
      // one.
      toast.error(err instanceof Error ? err.message : "Could not use that");
    } finally {
      setUsingItemId(null);
      setPendingUse(null);
    }
  };

  const toggleGroup = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!user) {
    return (
      <Container>
        <Empty>
          <p>Please log in to view this inventory.</p>
        </Empty>
      </Container>
    );
  }

  if (loading && !data) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <Container>
        <Empty>
          <p>
            That inventory could not be loaded. It may belong to a community you
            are not a member of. {error.message}
          </p>
        </Empty>
      </Container>
    );
  }

  const who = report?.member.displayName || report?.member.username;

  return (
    <Container>
      <Header>
        <div>
          <Title>{viewingSelf ? "Your Inventory" : `${who}'s Items`}</Title>
          <Subtitle>
            Items in {communityData?.community?.name || "this community"}
          </Subtitle>
        </div>
      </Header>

      {/* Coin and items are one answer to "what does this person have".
          Splitting them across two pages makes a trade partner check twice.
          Renders nothing when the community defines no currencies. */}
      {communityId && targetUserId && (
        <CurrencyWallet
          communityId={communityId}
          userId={targetUserId}
          isOwnWallet={viewingSelf}
        />
      )}

      <Tiles>
        <Tile data-testid="holdings-total">
          <div className="k">Items held</div>
          <div className="v">{report?.totalItems ?? 0}</div>
        </Tile>
        <Tile>
          <div className="k">Item types</div>
          <div className="v">{report?.distinctTypes ?? 0}</div>
        </Tile>
      </Tiles>

      {holdings.length === 0 ? (
        <Empty>
          <Package
            size={40}
            style={{ opacity: 0.5, marginBottom: "0.75rem" }}
          />
          <p>
            {viewingSelf
              ? "You don't have any items in this community yet. Items can be granted by community administrators."
              : `${who} holds nothing in this community.`}
          </p>
        </Empty>
      ) : (
        <div data-testid="holdings-list">
          {holdings.map((h) => {
            // A single item needs no disclosure: there is nothing to collapse,
            // and hiding one chip behind a click just puts a step between a
            // member and the only history they could have wanted.
            const open = expanded.has(h.itemType.id) || h.count === 1;
            return (
              <Group
                key={h.itemType.id}
                data-testid="holding-group"
                data-item-type-id={h.itemType.id}
              >
                <GroupHead>
                  <Swatch $hex={h.itemType.color?.hexCode}>
                    {h.itemType.image ? (
                      <img
                        src={
                          h.itemType.image.thumbnailUrl ||
                          h.itemType.image.originalUrl
                        }
                        alt={h.itemType.image.altText || h.itemType.name}
                      />
                    ) : (
                      <Package size={20} />
                    )}
                  </Swatch>
                  <GroupInfo>
                    <GroupName>
                      <Link to={`/item-types/${h.itemType.id}`}>
                        {h.itemType.name}
                      </Link>
                    </GroupName>
                    <GroupMeta>
                      {[
                        h.itemType.category,
                        h.itemType.isTradeable ? "Tradeable" : null,
                        h.itemType.isConsumable ? "Consumable" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </GroupMeta>
                  </GroupInfo>
                  <Count>×{h.count}</Count>
                  {h.count > 1 && (
                    <Expand
                      type="button"
                      $open={open}
                      data-testid="expand-group"
                      onClick={() => toggleGroup(h.itemType.id)}
                    >
                      {open ? "Hide" : "Show"} items
                      <ChevronDown size={14} />
                    </Expand>
                  )}
                </GroupHead>

                {open && (
                  <Items>
                    {h.items.map((item, i) => (
                      <ItemRow key={item.id} data-testid="holding-item">
                        <Link
                          to={`/communities/${communityId}/items/${item.id}`}
                        >
                          #{i + 1}
                          <Since>{formatDate(item.createdAt)}</Since>
                        </Link>
                        {/* An MYO ticket is spent by making a character with
                            it, which needs a name, a variant and traits --
                            none of which fit in a confirm dialog. So this one
                            is a link, and nothing is consumed by following
                            it: the ticket is spent when that form is
                            submitted, not here. */}
                        {viewingSelf && h.itemType.useMyoGrant && (
                          <UseButton
                            as={Link}
                            to={`/character/create?ticket=${item.id}`}
                            data-testid={`use-item-${item.id}`}
                          >
                            Make a character
                          </UseButton>
                        )}
                        {/* An edit kit needs a character before it needs
                            anything else, so this is a link to a picker.
                            Nothing is consumed by following it -- the kit is
                            spent when the change is submitted. */}
                        {viewingSelf && h.itemType.useTraitEditGrant && (
                          <UseButton
                            as={Link}
                            to={`/communities/${communityId}/edit-kits/${item.id}`}
                            data-testid={`use-item-${item.id}`}
                          >
                            Edit a character
                          </UseButton>
                        )}
                        {/* Only on your own inventory, and only when using it
                            would do something. A Use button on somebody
                            else's items, or on one that pays nothing, is a
                            button whose every press is a refusal. */}
                        {viewingSelf && h.itemType.usePayout.length > 0 && (
                          <UseButton
                            type="button"
                            data-testid={`use-item-${item.id}`}
                            disabled={usingItemId !== null}
                            onClick={() =>
                              setPendingUse({
                                itemId: item.id,
                                itemTypeName: h.itemType.name,
                                payout: h.itemType.usePayout
                                  .map(
                                    (c) =>
                                      `${c.amount.toLocaleString()} ${
                                        c.currency.symbol || c.currency.code
                                      }`,
                                  )
                                  .join(" + "),
                              })
                            }
                          >
                            {usingItemId === item.id ? "Redeeming…" : "Redeem"}
                          </UseButton>
                        )}
                      </ItemRow>
                    ))}
                  </Items>
                )}
              </Group>
            );
          })}
        </div>
      )}

      {/* Using destroys the item and there is no un-use, so it never happens
          on a single click -- the same rule the shop's refunds follow. The
          payout is named because that is the thing being traded for it. */}
      <ConfirmDialog
        open={pendingUse !== null}
        title={pendingUse ? `Redeem ${pendingUse.itemTypeName}?` : "Redeem it?"}
        confirmLabel="Redeem it"
        busyLabel="Redeeming…"
        busy={usingItemId !== null}
        onCancel={() => setPendingUse(null)}
        onConfirm={() => {
          if (pendingUse) void handleUse(pendingUse.itemId);
        }}
        testId="use-item-dialog"
      >
        {pendingUse && (
          <>
            This uses it up and pays you <strong>{pendingUse.payout}</strong>.
            The item is gone afterwards.
          </>
        )}
      </ConfirmDialog>
    </Container>
  );
};
