import React, { useMemo, useState } from "react";
import styled, { css } from "styled-components";
import { Link } from "react-router-dom";
import {
  ShoppingCart,
  Package,
  Undo2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@chardb/ui";
import { toast } from "react-hot-toast";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useShopCart, MAX_UNITS_PER_ITEM } from "../hooks/useShopCart";
import { useCommunityId } from "../contexts/CommunityHostContext";
import {
  useGetShopItemsQuery,
  useGetMyShopPurchaseLinesQuery,
  useGetMemberWalletQuery,
  useCheckoutMutation,
  useRefundShopPurchaseLineMutation,
  type ShopItemFieldsFragment,
} from "../generated/graphql";
import { useAuth } from "../contexts/AuthContext";
import { formatAmount, formatPrice, sumPrices } from "../lib/currencyDisplay";

/**
 * The shop as a member sees it.
 *
 * Three things on one page: what is for sale, what is in the cart, and what
 * has already been bought. The last is there because the undo button lives on
 * it and fifteen minutes is not long enough to go looking for another page.
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
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
  max-width: 60ch;
`;

const Wallet = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
`;

const WalletLabel = styled.span`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const WalletAmounts = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
`;

const WalletAmount = styled.span`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const WalletEmpty = styled.span`
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const WalletLink = styled(Link)`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 1.5rem;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
`;

const Card = styled.div<{ $blocked: boolean }>`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  /*
   * Dimmed per child rather than on the card, so the notice explaining why it
   * is dimmed stays legible. Opacity on a parent makes a stacking context and
   * a child cannot come back out of it -- the callout would be muted along
   * with the very thing it is there to explain.
   */
  ${({ $blocked }) =>
    $blocked &&
    css`
      & > *:not([data-blocked-notice]) {
        opacity: 0.55;
      }
    `}
`;

/**
 * Why this listing cannot be bought, said where the buttons are.
 *
 * Tinted rather than muted: it was previously rendered in CardMeta, the same
 * style as "Grants Trait Change Potion", so the one line that explained a
 * blocked card looked exactly like the line describing it.
 */
const BlockedNotice = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.25rem;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.warning}20;
  border: 1px solid ${({ theme }) => theme.colors.warning}45;
`;

const CardName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CardMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const CardDescription = styled.p`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const Prices = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: auto;
  padding-top: 0.5rem;
`;

/**
 * An option the viewer cannot afford is dimmed, not hidden.
 *
 * A shop that hides what you cannot afford gives you no reason to go and earn
 * anything, and no way to find out what the thing is worth.
 */
const PriceButton = styled.button<{ $affordable: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.8125rem;
  cursor: pointer;
  opacity: ${({ $affordable }) => ($affordable ? 1 : 0.45)};

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  /* Sold out and at-the-cap options are disabled whether or not the buyer can
     afford them, so the dimming cannot be left to affordability alone -- an
     affordable price that does nothing when clicked reads as a broken button. */
  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

const Aside = styled.aside`
  position: sticky;
  top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Panel = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  padding: 1rem;
`;

const PanelTitle = styled.h2`
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CartRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.8125rem;

  &:last-of-type {
    border-bottom: none;
  }
`;

const CartName = styled.div`
  flex: 1;
  min-width: 0;
`;

const QtyInput = styled.input`
  width: 3.25rem;
  padding: 0.2rem 0.3rem;
  text-align: right;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font-variant-numeric: tabular-nums;
`;

const Total = styled.div`
  margin-top: 0.75rem;
  padding-top: 0.6rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
`;

/** How many lines the sidebar panel shows before deferring to the page. */
const PANEL_LINES = 8;

const PurchaseRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.8125rem;

  &:last-child {
    border-bottom: none;
  }
`;

/** Says how much of the history the panel is not showing, and links to it. */
const PanelFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.6rem;
  padding-top: 0.5rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.8125rem;
`;

const UndoButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.45rem;
  font-size: 0.75rem;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  white-space: nowrap;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Empty = styled.div`
  text-align: center;
  padding: 2.5rem 1.5rem;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Modal = styled.div<{ $isOpen: boolean }>`
  display: ${({ $isOpen }) => ($isOpen ? "flex" : "none")};
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.colors.background};
  padding: 2rem;
  border-radius: 12px;
  max-width: 460px;
  width: 90%;
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
`;

const stockLabel = (item: ShopItemFieldsFragment): string | null => {
  if (item.stock === null || item.stock === undefined) return null;
  if (item.stock === 0) return "Sold out";
  return `${item.stock} left`;
};

/** Nobody can buy it, as opposed to this viewer having spent their allowance. */
const isSoldOut = (item: ShopItemFieldsFragment) => item.stock === 0;

/** This viewer holds as many as the listing lets one person hold. */
const isCapped = (item: ShopItemFieldsFragment) =>
  item.maxPerUser !== null &&
  item.maxPerUser !== undefined &&
  item.purchasedByViewer >= item.maxPerUser;

/**
 * Why a price cannot be acted on, or null when it can.
 *
 * One source for the notice on the card and the tooltip on each button, so the
 * two cannot say different things. Ordered by precedence: a sold-out listing
 * is sold out whether or not you could have afforded it.
 *
 * Affordability is last and deliberately does not disable anything. It is
 * computed from balances read a moment ago, and checkout is what decides -- a
 * button that refuses a purchase the server would have allowed is worse than
 * one that lets the server say no.
 */
const blockedReason = (
  item: ShopItemFieldsFragment,
  affordable: boolean,
): string | null => {
  if (isSoldOut(item)) return "Sold out";
  if (isCapped(item)) return "Purchase limit reached";
  if (!affordable) return "You cannot afford this yet";
  return null;
};

export const CommunityShopPage: React.FC = () => {
  const communityId = useCommunityId();
  const { user } = useAuth();
  const cart = useShopCart(communityId ?? undefined);
  const [confirming, setConfirming] = useState(false);
  /**
   * The purchase awaiting a yes on Undo.
   *
   * Captured rather than looked up when the dialog renders: the panel
   * refetches after every buy, and a dialog that re-read the row could name a
   * different purchase than the one that was tapped.
   */
  const [undoTarget, setUndoTarget] = useState<{
    lineId: string;
    item: string;
    cost: string;
  } | null>(null);
  const [undoing, setUndoing] = useState(false);

  const { data, loading, error, refetch } = useGetShopItemsQuery({
    variables: { communityId: communityId as string },
    skip: !communityId,
    fetchPolicy: "cache-and-network",
  });

  // What the buyer holds, in the header. The listings already dim what is
  // unaffordable, but dimming says "not this one" without saying how short
  // they are -- and the answer to that is two clicks away on another page.
  const { data: walletData, refetch: refetchWallet } = useGetMemberWalletQuery({
    variables: {
      communityId: communityId as string,
      userId: user?.id as string,
    },
    skip: !communityId || !user?.id,
    fetchPolicy: "cache-and-network",
  });

  // Eight, asked for as eight rather than fetched whole and sliced. `total`
  // comes back counted against the same filters, which is what lets the panel
  // say how much it is not showing instead of silently dropping it (#289).
  const { data: purchaseData, refetch: refetchPurchases } =
    useGetMyShopPurchaseLinesQuery({
      variables: {
        filters: { communityId: communityId as string, limit: PANEL_LINES },
      },
      skip: !communityId,
      fetchPolicy: "cache-and-network",
    });

  const [checkout, { loading: buying }] = useCheckoutMutation();
  const [refundLine] = useRefundShopPurchaseLineMutation();

  const items = useMemo(() => data?.shopItems ?? [], [data]);
  const purchaseLines = useMemo(
    () => purchaseData?.myShopPurchaseLines.lines ?? [],
    [purchaseData],
  );
  const purchaseTotal = purchaseData?.myShopPurchaseLines.total ?? 0;
  // Zero balances are dropped here, unlike the wallet page. That page teaches
  // which currencies exist; this one is a running total while spending, and a
  // row of zeroes next to the price of something is only discouraging.
  const balances = useMemo(
    () =>
      (walletData?.memberWallet?.balances ?? []).filter((b) => b.amount > 0),
    [walletData],
  );

  /** Cart lines joined back to the listing and price they name. */
  const cartDetail = useMemo(
    () =>
      cart.lines.flatMap((line) => {
        const item = items.find((i) => i.id === line.shopItemId);
        const price = item?.prices.find((p) => p.id === line.shopPriceId);
        // A listing or price that has gone away since the cart was filled.
        // Dropped from the display rather than crashing on it; checkout would
        // refuse it anyway.
        if (!item || !price) return [];
        return [{ line, item, price }];
      }),
    [cart.lines, items],
  );

  const total = useMemo(
    () =>
      sumPrices(
        cartDetail.flatMap(({ line, price }) =>
          Array.from({ length: line.quantity }, () => price.components),
        ),
      ),
    [cartDetail],
  );

  const handleCheckout = async () => {
    if (!communityId) return;
    try {
      await checkout({
        variables: {
          input: {
            communityId,
            lines: cart.lines.map((l) => ({
              shopItemId: l.shopItemId,
              shopPriceId: l.shopPriceId,
              quantity: l.quantity,
            })),
          },
        },
      });
      toast.success("Bought. You have fifteen minutes to undo it.");
      cart.clear();
      setConfirming(false);
      await Promise.all([refetch(), refetchPurchases(), refetchWallet()]);
    } catch (err) {
      // The server is the authority on stock and affordability, so its
      // message is the useful one -- the cart only ever guessed.
      toast.error(err instanceof Error ? err.message : "Could not buy that");
    }
  };

  const handleUndo = async (lineId: string) => {
    setUndoing(true);
    try {
      await refundLine({ variables: { lineId } });
      toast.success("Refunded");
      await Promise.all([refetch(), refetchPurchases(), refetchWallet()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not undo that");
    } finally {
      setUndoing(false);
      setUndoTarget(null);
    }
  };

  if (!communityId) {
    return (
      <Container>
        <Empty>This page needs a community in the URL.</Empty>
      </Container>
    );
  }

  if (loading && items.length === 0) return <LoadingSpinner />;

  if (error) {
    return (
      <Container>
        <Empty>Could not load the shop: {error.message}</Empty>
      </Container>
    );
  }

  return (
    <Container data-testid="shop-page">
      <Header>
        <div>
          <Title>
            <ShoppingCart size={28} /> Shop
          </Title>
          <Subtitle>
            Spend what you have earned. Coin leaves circulation when it is spent
            — there is no treasury on the other side of this.
          </Subtitle>
        </div>
        <Wallet>
          <WalletLabel>Your wallet</WalletLabel>
          <WalletAmounts>
            {balances.length === 0 ? (
              <WalletEmpty>Nothing yet</WalletEmpty>
            ) : (
              balances.map((balance) => (
                <WalletAmount key={balance.currency.id}>
                  {formatAmount(balance.amount, balance.currency)}
                </WalletAmount>
              ))
            )}
          </WalletAmounts>
          <WalletLink to="/inventory">Full wallet and history</WalletLink>
        </Wallet>
      </Header>

      <Layout>
        <div>
          {items.length === 0 ? (
            <Empty data-testid="shop-empty">
              <Package size={36} style={{ opacity: 0.5 }} />
              <p>Nothing is for sale here yet.</p>
            </Empty>
          ) : (
            <Grid data-testid="shop-grid">
              {items.map((item) => {
                const soldOut = isSoldOut(item);
                const capped = isCapped(item);
                // Affordability does not block, so the card's own notice is
                // about the two states that do.
                const cardReason = blockedReason(item, true);
                return (
                  <Card
                    key={item.id}
                    $blocked={soldOut || capped}
                    data-testid={`shop-item-${item.id}`}
                  >
                    <CardName>{item.name || item.itemType.name}</CardName>
                    <CardMeta>
                      Grants {item.itemType.name}
                      {stockLabel(item) ? ` · ${stockLabel(item)}` : ""}
                      {item.maxPerUser
                        ? ` · ${item.purchasedByViewer}/${item.maxPerUser} bought`
                        : ""}
                    </CardMeta>
                    {item.description && (
                      <CardDescription>{item.description}</CardDescription>
                    )}
                    <Prices>
                      {item.prices.map((price) => (
                        <PriceButton
                          key={price.id}
                          $affordable={price.affordable}
                          disabled={soldOut || capped}
                          // Every reason it cannot be acted on, not only the
                          // one that leaves the button enabled. A button
                          // disabled by stock or by the cap used to explain
                          // nothing at all on hover.
                          title={
                            blockedReason(item, price.affordable) ?? undefined
                          }
                          onClick={() => cart.add(item.id, price.id)}
                          data-testid={`shop-price-${price.id}`}
                        >
                          <span>{formatPrice(price.components)}</span>
                          <span>+</span>
                        </PriceButton>
                      ))}
                    </Prices>
                    {cardReason && (
                      <BlockedNotice
                        data-blocked-notice
                        data-testid={`shop-blocked-${item.id}`}
                      >
                        <AlertTriangle size={14} />
                        {cardReason}
                      </BlockedNotice>
                    )}
                  </Card>
                );
              })}
            </Grid>
          )}
        </div>

        <Aside>
          <Panel data-testid="shop-cart">
            <PanelTitle>
              <ShoppingCart size={16} /> Cart
              {cart.count > 0 && <Muted>({cart.count})</Muted>}
            </PanelTitle>
            {cartDetail.length === 0 ? (
              <Muted>Nothing in it yet.</Muted>
            ) : (
              <>
                {cartDetail.map(({ line, item, price }) => (
                  <CartRow key={`${line.shopItemId}:${line.shopPriceId}`}>
                    <CartName>
                      <div>{item.name || item.itemType.name}</div>
                      <Muted>{formatPrice(price.components)} each</Muted>
                    </CartName>
                    <QtyInput
                      type="number"
                      min={0}
                      max={MAX_UNITS_PER_ITEM}
                      step={1}
                      value={line.quantity}
                      aria-label={`Quantity of ${item.name || item.itemType.name}`}
                      onChange={(e) =>
                        cart.setQuantity(
                          line.shopItemId,
                          line.shopPriceId,
                          Math.trunc(Number(e.target.value)) || 0,
                        )
                      }
                    />
                  </CartRow>
                ))}
                <Total data-testid="cart-total">
                  {/* Currencies never convert, so a total is a set of amounts
                      rather than one number. */}
                  Total:{" "}
                  <strong>
                    {total.map((t) => formatPrice([{ ...t }])).join(" + ")}
                  </strong>
                </Total>
                <ModalActions>
                  <Button variant="secondary" onClick={cart.clear} size="sm">
                    Clear
                  </Button>
                  <Button onClick={() => setConfirming(true)} size="sm">
                    Buy
                  </Button>
                </ModalActions>
              </>
            )}
          </Panel>

          <Panel data-testid="shop-purchases">
            <PanelTitle>Recent purchases</PanelTitle>
            {purchaseLines.length === 0 ? (
              <Muted>Nothing bought yet.</Muted>
            ) : (
              purchaseLines.map((line) => (
                <PurchaseRow key={line.id} data-testid={`purchase-${line.id}`}>
                  <CartName>
                    <div>
                      {line.shopItem.name || line.shopItem.itemType.name}
                    </div>
                    <Muted>
                      {formatPrice(line.costs)}
                      {line.refundedAt ? " · refunded" : ""}
                    </Muted>
                  </CartName>
                  {line.refundableByViewer ? (
                    <UndoButton
                      onClick={() =>
                        setUndoTarget({
                          lineId: line.id,
                          item:
                            line.shopItem.name || line.shopItem.itemType.name,
                          cost: formatPrice(line.costs),
                        })
                      }
                      data-testid={`undo-${line.id}`}
                    >
                      <Undo2 size={12} /> Undo
                    </UndoButton>
                  ) : (
                    // The server says why, so the reason is never a guess
                    // made from a timestamp on this side.
                    <Muted title={line.refundBlockedReason ?? undefined}>
                      {line.refundedAt ? <Check size={14} /> : "—"}
                    </Muted>
                  )}
                </PurchaseRow>
              ))
            )}
            {/* Truncation said out loud. Silently showing the eight most
                recent is how a buyer with twenty purchases concluded the
                older ten were gone (#289). */}
            {purchaseTotal > purchaseLines.length && (
              <PanelFooter data-testid="shop-purchases-more">
                <Muted>
                  Showing {purchaseLines.length} of {purchaseTotal}
                </Muted>
                <Link to="/shop/purchases">View all</Link>
              </PanelFooter>
            )}
          </Panel>
        </Aside>
      </Layout>

      {/* Spending is irreversible after fifteen minutes, so it never happens
          on a single click. */}
      <Modal $isOpen={confirming}>
        <ModalContent data-testid="checkout-dialog">
          <ModalTitle>
            Buy {cart.count} thing{cart.count === 1 ? "" : "s"}?
          </ModalTitle>
          {cartDetail.map(({ line, item, price }) => (
            <CartRow key={`${line.shopItemId}:${line.shopPriceId}`}>
              <CartName>
                {line.quantity} × {item.name || item.itemType.name}
              </CartName>
              <Muted>{formatPrice(price.components)} each</Muted>
            </CartRow>
          ))}
          <Total>
            This will spend{" "}
            <strong>
              {total.map((t) => formatPrice([{ ...t }])).join(" + ")}
            </strong>
            .
          </Total>
          <ModalActions>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckout} disabled={buying}>
              {buying ? "Buying…" : "Confirm"}
            </Button>
          </ModalActions>
        </ModalContent>
      </Modal>

      {/* Undo is the recovery path, so gating it is a real trade-off. It gets
          a gate anyway, because undoing is not reliably reversible either: it
          returns the copy to a limited stock, and if someone else takes it --
          or the listing caps how many one person may hold -- re-buying is not
          available. Same one-tap-and-it-happened shape the staff refund had,
          and the reporter's point about mobile applies here too. */}
      <ConfirmDialog
        open={undoTarget !== null}
        title={undoTarget ? `Undo buying ${undoTarget.item}?` : "Undo?"}
        confirmLabel="Undo it"
        busyLabel="Undoing…"
        busy={undoing}
        onCancel={() => setUndoTarget(null)}
        onConfirm={() => {
          if (undoTarget) void handleUndo(undoTarget.lineId);
        }}
        testId="undo-dialog"
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
