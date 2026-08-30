import React, { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { ArrowDownUp } from "lucide-react";
import { Button, Input } from "@chardb/ui";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";
import {
  useTradeComposerQuery,
  useProposeTradeMutation,
} from "../graphql/trades.graphql";

const Container = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  margin: 0 0 0.25rem;
`;

const Sub = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
`;

const Panes = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 0.85rem;

  @media (max-width: 940px) {
    grid-template-columns: 1fr;
  }
`;

const Pane = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
`;

const PaneHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 0.9rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  font-size: 0.8125rem;
  font-weight: 600;
`;

const Hint = styled.span`
  font-size: 0.6875rem;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const PaneBody = styled.div`
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const Pick = styled.button<{ $on?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  text-align: left;
  font: inherit;
  font-size: 0.875rem;
  padding: 0.5rem 0.6rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid
    ${({ theme, $on }) => ($on ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $on }) =>
    $on ? `${theme.colors.primary}14` : theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const Qty = styled.span`
  margin-left: auto;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Lock = styled.span`
  margin-left: auto;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.error};
`;

const Side = styled.div<{ $mine?: boolean }>`
  border: 1px solid
    ${({ theme, $mine }) =>
      $mine ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};
  padding: 0.7rem;
`;

const SideHead = styled.h2`
  margin: 0 0 0.5rem;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: ${({ theme }) => theme.colors.surface};
  font-size: 0.875rem;

  & + & {
    margin-top: 0.35rem;
  }
`;

const Stepper = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.35rem;

  button {
    width: 22px;
    height: 22px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.background};
    color: inherit;
    border-radius: 4px;
    cursor: pointer;
    line-height: 1;
  }
`;

/** Coin is a price, so it gets a field rather than a row of its own. */
const Price = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.45rem 0.55rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.8125rem;

  input {
    margin-left: auto;
    width: 110px;
    text-align: right;
  }
`;

const Swap = styled.div`
  display: flex;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.muted};
  padding: 0.4rem 0;
`;

const SideEmpty = styled.p`
  margin: 0;
  padding: 0.75rem 0;
  text-align: center;
  font-size: 0.8125rem;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Foot = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  margin-top: ${({ theme }) => theme.spacing.lg};
  flex-wrap: wrap;
`;

const Problem = styled.div`
  flex: 1 1 100%;
  padding: 0.7rem 0.9rem;
  border: 1px solid ${({ theme }) => theme.colors.error};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.error}12;
  color: ${({ theme }) => theme.colors.error};
  font-size: 0.875rem;
`;

const LoadingWrap = styled.div`
  display: flex;
  justify-content: center;
  min-height: 300px;
  align-items: center;
`;

/**
 * Build an offer.
 *
 * The asymmetry between the two panes is the point. What you offer is specific
 * rows, because you are here and can choose. What you ask for is a type and a
 * count, because any of theirs will do and pinning one would make the offer
 * fail the moment they trade that copy away.
 */
export const TradeComposerPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const themId = params.get("with") ?? "";

  /** Item ids I am handing over. */
  const [offering, setOffering] = useState<Set<string>>(new Set());
  /** itemTypeId -> how many of theirs I want. */
  const [requesting, setRequesting] = useState<Map<string, number>>(new Map());
  const [coinOut, setCoinOut] = useState("");
  const [coinIn, setCoinIn] = useState("");
  const [currencyId, setCurrencyId] = useState<string>("");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const { data, loading } = useTradeComposerQuery({
    variables: { communityId: communityId!, meId: user?.id ?? "", themId },
    skip: !communityId || !user?.id || !themId,
  });

  const [proposeTrade, { loading: sending }] = useProposeTradeMutation();

  // Memoised because `?? []` mints a new array on every render before the
  // query resolves, which would make the useMemo below recompute each time.
  const mine = useMemo(() => data?.mine.holdings ?? [], [data]);
  const theirs = useMemo(() => data?.theirs.holdings ?? [], [data]);
  const balances = useMemo(() => data?.wallet.balances ?? [], [data]);
  const currency =
    balances.find((b) => b.currency.id === currencyId) ?? balances[0];

  const toggleOffer = useCallback((itemId: string) => {
    setOffering((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const bumpRequest = useCallback((typeId: string, by: number, max: number) => {
    setRequesting((prev) => {
      const next = new Map(prev);
      const value = (next.get(typeId) ?? 0) + by;
      if (value <= 0) next.delete(typeId);
      else next.set(typeId, Math.min(value, max));
      return next;
    });
  }, []);

  const out = Number(coinOut) || 0;
  const back = Number(coinIn) || 0;
  const net = out - back;
  const overdrawn = currency ? out > currency.amount : out > 0;
  const empty =
    offering.size === 0 && requesting.size === 0 && out === 0 && back === 0;

  const offeredRows = useMemo(
    () =>
      mine.flatMap((h) =>
        h.items
          .filter((i) => offering.has(i.id))
          .map((i) => ({ id: i.id, name: h.itemType.name })),
      ),
    [mine, offering],
  );

  const send = useCallback(async () => {
    setProblem(null);
    try {
      // Coin goes over as both halves; the server nets them into one line, so
      // "250 out, 100 back" arrives stored as 150 one way.
      const coin = [
        ...(out > 0 && currency
          ? [
              {
                currencyId: currency.currency.id,
                amount: out,
                fromProposer: true,
              },
            ]
          : []),
        ...(back > 0 && currency
          ? [
              {
                currencyId: currency.currency.id,
                amount: back,
                fromProposer: false,
              },
            ]
          : []),
      ];

      const result = await proposeTrade({
        variables: {
          input: {
            communityId: communityId as string,
            recipientId: themId,
            offering: [...offering].map((itemId) => ({ itemId })),
            requesting: [...requesting.entries()].map(
              ([itemTypeId, quantity]) => ({ itemTypeId, quantity }),
            ),
            coin,
            note: note.trim() || undefined,
          },
        },
      });
      const id = result.data?.proposeTrade.id;
      if (id) navigate(`/trades/${id}`);
    } catch (err) {
      setProblem(
        err instanceof Error ? err.message : "That offer could not be sent",
      );
    }
  }, [
    out,
    back,
    currency,
    proposeTrade,
    communityId,
    themId,
    offering,
    requesting,
    note,
    navigate,
  ]);

  if (!themId) {
    return (
      <Container>
        <SideEmpty>Pick someone to trade with first.</SideEmpty>
      </Container>
    );
  }

  if (loading && !data) {
    return (
      <LoadingWrap>
        <LoadingSpinner />
      </LoadingWrap>
    );
  }

  return (
    <Container>
      <Title>New trade offer</Title>
      <Sub>
        Nothing moves until they accept, and everything is checked again at that
        moment.
      </Sub>

      {balances.length > 1 && (
        <Sub as="div" style={{ marginBottom: "1rem" }}>
          {/* One currency per offer for now. The schema can carry several, and
              the server nets each separately, but a composer that priced one
              side in coin and the other in event chits would be a market
              before it was a feature. */}
          <label>
            Coin{" "}
            <select
              value={currency?.currency.id ?? ""}
              onChange={(e) => setCurrencyId(e.target.value)}
            >
              {balances.map((b) => (
                <option key={b.currency.id} value={b.currency.id}>
                  {b.currency.name} · {b.amount.toLocaleString()}{" "}
                  {b.currency.code}
                </option>
              ))}
            </select>
          </label>
        </Sub>
      )}

      <Panes>
        <Pane>
          <PaneHead>
            Your items <Hint>tap to offer</Hint>
          </PaneHead>
          <PaneBody>
            {mine.length === 0 && <SideEmpty>You hold nothing here.</SideEmpty>}
            {mine.flatMap((h) =>
              h.items.map((item) => (
                <Pick
                  key={item.id}
                  type="button"
                  $on={offering.has(item.id)}
                  disabled={!h.itemType.isTradeable}
                  onClick={() => toggleOffer(item.id)}
                >
                  <span>{h.itemType.name}</span>
                  {h.itemType.isTradeable ? (
                    <Qty>{offering.has(item.id) ? "on table" : "offer"}</Qty>
                  ) : (
                    <Lock>locked</Lock>
                  )}
                </Pick>
              )),
            )}
          </PaneBody>
        </Pane>

        <Pane>
          <PaneHead>The table</PaneHead>
          <PaneBody>
            <Side $mine>
              <SideHead>You give</SideHead>
              {offeredRows.length === 0 ? (
                <SideEmpty>No items offered</SideEmpty>
              ) : (
                offeredRows.map((row) => (
                  <Row key={row.id}>
                    <span>{row.name}</span>
                    <Stepper>
                      <button
                        type="button"
                        aria-label={`Remove ${row.name}`}
                        onClick={() => toggleOffer(row.id)}
                      >
                        ×
                      </button>
                    </Stepper>
                  </Row>
                ))
              )}
              {currency && (
                <Price>
                  <span>plus</span>
                  <strong>{currency.currency.code}</strong>
                  <Input
                    type="number"
                    min={0}
                    max={currency.amount}
                    value={coinOut}
                    placeholder="0"
                    aria-label={`${currency.currency.name} you give`}
                    onChange={(e) => setCoinOut(e.target.value)}
                  />
                </Price>
              )}
            </Side>

            <Swap>
              <ArrowDownUp size={16} />
            </Swap>

            <Side>
              <SideHead>You receive</SideHead>
              {requesting.size === 0 ? (
                <SideEmpty>No items requested</SideEmpty>
              ) : (
                [...requesting.entries()].map(([typeId, qty]) => {
                  const held = theirs.find((h) => h.itemType.id === typeId);
                  return (
                    <Row key={typeId}>
                      <span>{held?.itemType.name ?? "Item"}</span>
                      <Stepper>
                        <button
                          type="button"
                          aria-label="Fewer"
                          onClick={() =>
                            bumpRequest(typeId, -1, held?.count ?? 1)
                          }
                        >
                          −
                        </button>
                        <span>{qty}</span>
                        <button
                          type="button"
                          aria-label="More"
                          onClick={() =>
                            bumpRequest(typeId, 1, held?.count ?? 1)
                          }
                        >
                          +
                        </button>
                      </Stepper>
                    </Row>
                  );
                })
              )}
              {currency && (
                <Price>
                  <span>plus</span>
                  <strong>{currency.currency.code}</strong>
                  <Input
                    type="number"
                    min={0}
                    value={coinIn}
                    placeholder="0"
                    aria-label={`${currency.currency.name} you receive`}
                    onChange={(e) => setCoinIn(e.target.value)}
                  />
                </Price>
              )}
            </Side>
          </PaneBody>
        </Pane>

        <Pane>
          <PaneHead>
            Their items <Hint>any copy will do</Hint>
          </PaneHead>
          <PaneBody>
            {theirs.length === 0 && (
              <SideEmpty>They hold nothing here.</SideEmpty>
            )}
            {theirs.map((h) => (
              <Pick
                key={h.itemType.id}
                type="button"
                $on={requesting.has(h.itemType.id)}
                disabled={!h.itemType.isTradeable}
                onClick={() => bumpRequest(h.itemType.id, 1, h.count)}
              >
                <span>{h.itemType.name}</span>
                {h.itemType.isTradeable ? (
                  <Qty>×{h.count}</Qty>
                ) : (
                  <Lock>locked</Lock>
                )}
              </Pick>
            ))}
          </PaneBody>
        </Pane>
      </Panes>

      <Foot>
        {problem && <Problem role="alert">{problem}</Problem>}
        {overdrawn && currency && (
          <Problem role="alert">
            You are offering {out.toLocaleString()} {currency.currency.code}{" "}
            against a balance of {currency.amount.toLocaleString()}.
          </Problem>
        )}
        <div style={{ flex: 1, minWidth: 220 }}>
          <Input
            placeholder="Add a note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {net !== 0 && currency && (
            <Sub style={{ margin: "0.5rem 0 0" }}>
              Net {Math.abs(net).toLocaleString()} {currency.currency.code}{" "}
              {net > 0 ? "from you" : "to you"} — sent as a single amount.
            </Sub>
          )}
        </div>
        <Button
          variant="primary"
          disabled={empty || overdrawn || sending}
          onClick={send}
        >
          Send offer
        </Button>
      </Foot>
    </Container>
  );
};
