import React, { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { ArrowDownUp } from "lucide-react";
import { Avatar, Button } from "@chardb/ui";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";
import {
  EffectiveTradeStatus,
  useTradeQuery,
  useAcceptTradeMutation,
  useDeclineTradeMutation,
  useCancelTradeMutation,
  type TradeFieldsFragment,
} from "../graphql/trades.graphql";
import {
  actionsFor,
  describeCharacter,
  describeCoin,
  describeLine,
  describeExpiry,
  sidesFor,
  STATUS_LABEL,
} from "../components/trades/trade-display";

const Container = styled.div`
  max-width: 860px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  margin: 0;
`;

const Sub = styled.p`
  margin: 0.25rem 0 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
`;

const Status = styled.span<{ $open: boolean }>`
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ theme, $open }) =>
    $open ? `${theme.colors.primary}20` : theme.colors.surface};
  color: ${({ theme, $open }) =>
    $open ? theme.colors.primary : theme.colors.text.muted};
`;

const Table = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
`;

const Side = styled.div<{ $mine?: boolean }>`
  padding: 1rem 1.1rem;
  border-left: 3px solid
    ${({ theme, $mine }) => ($mine ? theme.colors.primary : "transparent")};
`;

const SideHead = styled.h2`
  margin: 0 0 0.6rem;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Line = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0;
  font-size: 0.9375rem;
`;

const CharacterLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const Swap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0;
  color: ${({ theme }) => theme.colors.text.muted};
  border-block: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
`;

const Empty = styled.p`
  margin: 0;
  font-size: 0.875rem;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Note = styled.blockquote`
  margin: ${({ theme }) => theme.spacing.lg} 0 0;
  padding: 0.75rem 1rem;
  border-left: 3px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.9375rem;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const Problem = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  padding: 0.75rem 1rem;
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

function LineRows({
  items,
  characters,
  coin,
}: {
  items: TradeFieldsFragment["items"];
  characters: TradeFieldsFragment["characterLines"];
  coin: TradeFieldsFragment["currencyLines"];
}) {
  if (items.length === 0 && characters.length === 0 && coin.length === 0) {
    return <Empty>Nothing</Empty>;
  }
  return (
    <>
      {items.map((line) => (
        <Line key={line.id}>{describeLine(line)}</Line>
      ))}
      {/* Linked where items are not: a character is a page someone is being
          asked to take on, and deciding without looking at it is not a
          decision. An item is a name and a count. */}
      {characters.map((line) => (
        <Line key={line.id}>
          <CharacterLink to={`/character/${line.character.id}`}>
            {describeCharacter(line)}
          </CharacterLink>
        </Line>
      ))}
      {coin.map((line) => (
        <Line key={line.id}>{describeCoin(line)}</Line>
      ))}
    </>
  );
}

/**
 * One offer, and the buttons for answering it.
 *
 * Accept sends no selections. A by-type line means any rows will do, so the
 * server picks — newest first — and the recipient is not asked a question they
 * have no basis to answer. Choosing particular rows is a deliberate act and
 * belongs behind an affordance, not in the main path.
 */
export const TradeOfferPage: React.FC = () => {
  const { tradeId } = useParams<{ tradeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [problem, setProblem] = useState<string | null>(null);

  const { data, loading, error, refetch } = useTradeQuery({
    variables: { id: tradeId! },
    skip: !tradeId,
    fetchPolicy: "cache-and-network",
  });

  const [acceptTrade, { loading: accepting }] = useAcceptTradeMutation();
  const [declineTrade, { loading: declining }] = useDeclineTradeMutation();
  const [cancelTrade, { loading: cancelling }] = useCancelTradeMutation();

  const trade = data?.trade;
  const viewerId = user?.id ?? "";

  const sides = useMemo(
    () => (trade ? sidesFor(trade, viewerId) : null),
    [trade, viewerId],
  );
  const actions = trade ? actionsFor(trade, viewerId) : null;

  /** Runs an action, surfacing its failure. Returns whether it went through. */
  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setProblem(null);
      try {
        await fn();
        await refetch();
        return true;
      } catch (err) {
        // Settlement re-checks everything, so this is where "they no longer
        // hold it" and "you cannot cover that" actually surface. The message is
        // the server's, because it is the only thing that knows which line.
        setProblem(
          err instanceof Error ? err.message : "That could not be completed",
        );
        return false;
      }
    },
    [refetch],
  );

  if (loading && !data) {
    return (
      <LoadingWrap>
        <LoadingSpinner />
      </LoadingWrap>
    );
  }

  if (error || !trade || !sides || !actions) {
    return (
      <Container>
        <Empty>
          That trade could not be loaded. It may not be yours.{" "}
          {error?.message ?? ""}
        </Empty>
      </Container>
    );
  }

  const other =
    trade.proposer.id === viewerId ? trade.recipient : trade.proposer;
  const otherName = other.displayName || other.username;
  const open = trade.status === EffectiveTradeStatus.Pending;

  return (
    <Container>
      <Header>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Avatar image={other.avatarImage} name={otherName} size={44} />
          <div>
            <Title>
              {trade.proposer.id === viewerId
                ? `Your offer to ${otherName}`
                : `Offer from ${otherName}`}
            </Title>
            <Sub>
              {trade.community.name}
              {open ? ` · expires ${describeExpiry(trade.expiresAt)}` : ""}
            </Sub>
          </div>
        </div>
        <Status $open={open} data-testid="trade-status">
          {STATUS_LABEL[trade.status]}
        </Status>
      </Header>

      <Table>
        <Side $mine data-testid="offer-give">
          <SideHead>You give</SideHead>
          <LineRows
            items={sides.giving.items}
            characters={sides.giving.characters}
            coin={sides.giving.coin}
          />
        </Side>
        <Swap>
          <ArrowDownUp size={16} />
        </Swap>
        <Side data-testid="offer-receive">
          <SideHead>You receive</SideHead>
          <LineRows
            items={sides.receiving.items}
            characters={sides.receiving.characters}
            coin={sides.receiving.coin}
          />
        </Side>
      </Table>

      {trade.note && <Note>{trade.note}</Note>}

      {problem && <Problem role="alert">{problem}</Problem>}

      {(actions.canRespond || actions.canCancel) && (
        <Actions>
          {actions.canRespond && (
            <>
              <Button
                variant="ghost"
                disabled={declining}
                data-testid="decline-trade"
                onClick={() =>
                  run(() => declineTrade({ variables: { id: trade.id } }))
                }
              >
                Decline
              </Button>
              <Button
                variant="secondary"
                data-testid="counter-trade"
                onClick={() =>
                  // Only navigation. The decline happens with the replacement
                  // when the counter is sent, so opening the composer and
                  // changing your mind leaves this offer exactly as it was.
                  navigate(`/trades/new?with=${other.id}&mirror=${trade.id}`)
                }
              >
                Counter…
              </Button>
              <Button
                variant="primary"
                disabled={accepting}
                data-testid="accept-trade"
                onClick={() =>
                  run(() => acceptTrade({ variables: { id: trade.id } }))
                }
              >
                Accept trade
              </Button>
            </>
          )}
          {actions.canCancel && (
            <Button
              variant="ghost"
              disabled={cancelling}
              data-testid="cancel-trade"
              onClick={() =>
                run(() => cancelTrade({ variables: { id: trade.id } }))
              }
            >
              Withdraw offer
            </Button>
          )}
        </Actions>
      )}
    </Container>
  );
};
