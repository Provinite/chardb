import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";
import { ArrowLeftRight, X } from "lucide-react";
import { Avatar, Button } from "@chardb/ui";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";
import { useCommunityByIdQuery } from "../generated/graphql";
import {
  EffectiveTradeStatus,
  useTradesQuery,
} from "../graphql/trades.graphql";
import {
  describeExpiry,
  sidesFor,
  STATUS_LABEL,
  summariseSide,
} from "../components/trades/trade-display";

const PAGE_SIZE = 20;

const Container = styled.div`
  max-width: 860px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  margin: 0;
`;

const Tabs = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 0.375rem 0.75rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
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
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
`;

const Row = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  text-decoration: none;
  color: inherit;

  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }
`;

const Body = styled.div`
  min-width: 0;
  flex: 1;
`;

const Who = styled.div`
  font-weight: 600;
  font-size: 0.9375rem;
`;

const What = styled.div`
  margin-top: 0.15rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Meta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  white-space: nowrap;
`;

/** Says which community the list is narrowed to, and clears the narrowing. */
const Scope = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  font-size: 0.75rem;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Empty = styled.div`
  padding: 4rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Footer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const LoadingWrap = styled.div`
  display: flex;
  justify-content: center;
  min-height: 300px;
  align-items: center;
`;

/**
 * Both inboxes in one list: offers waiting on you and offers you have out.
 *
 * Splitting them into two pages would mean checking two places to know whether
 * anything needs you, and a trade is one conversation regardless of who opened
 * it. Which way a row points is said in its own text.
 */
export const TradesPage: React.FC = () => {
  const { user } = useAuth();
  // Which community, if any, is in the path rather than in a query string.
  // The sidebar reads community context off the pathname, so a narrowing it
  // cannot see is a narrowing that costs the member their community nav.
  const { communityId } = useParams<{ communityId?: string }>();
  const [status, setStatus] = useState<EffectiveTradeStatus | undefined>(
    EffectiveTradeStatus.Pending,
  );
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: communityData } = useCommunityByIdQuery({
    variables: { id: communityId! },
    skip: !communityId,
  });

  const { data, loading, error } = useTradesQuery({
    variables: { communityId, status, first: limit },
    fetchPolicy: "cache-and-network",
  });

  const viewerId = user?.id ?? "";
  const trades = data?.trades.nodes ?? [];
  const hasMore = data?.trades.hasNextPage ?? false;

  if (loading && !data) {
    return (
      <LoadingWrap>
        <LoadingSpinner />
      </LoadingWrap>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Trades</Title>
        <Tabs>
          <Tab
            type="button"
            $active={status === EffectiveTradeStatus.Pending}
            onClick={() => setStatus(EffectiveTradeStatus.Pending)}
          >
            Open
          </Tab>
          <Tab
            type="button"
            $active={status === EffectiveTradeStatus.Accepted}
            onClick={() => setStatus(EffectiveTradeStatus.Accepted)}
          >
            Settled
          </Tab>
          <Tab
            type="button"
            $active={status === undefined}
            onClick={() => setStatus(undefined)}
          >
            All
          </Tab>
        </Tabs>
      </Header>

      {communityId && (
        <Scope to="/trades" data-testid="trade-scope">
          {communityData?.community.name ?? "This community"} only
          <X size={12} />
        </Scope>
      )}

      {error ? (
        <Empty>Those trades could not be loaded. {error.message}</Empty>
      ) : trades.length === 0 ? (
        <Empty>
          <ArrowLeftRight
            size={36}
            style={{ opacity: 0.5, marginBottom: "0.75rem" }}
          />
          <p>
            {status === EffectiveTradeStatus.Pending
              ? "No open offers."
              : "Nothing here yet."}
          </p>
        </Empty>
      ) : (
        <List data-testid="trade-list">
          {trades.map((trade) => {
            const incoming = trade.recipient.id === viewerId;
            const other = incoming ? trade.proposer : trade.recipient;
            const name = other.displayName || other.username;
            const sides = sidesFor(trade, viewerId);
            // Through the trade's own community, not the one this list is
            // narrowed to -- the global inbox has no narrowing, and an offer
            // is a single-community thing wherever you found it.
            return (
              <Row
                key={trade.id}
                to={`/communities/${trade.community.id}/trades/${trade.id}`}
                data-testid="trade-row"
              >
                <Avatar image={other.avatarImage} name={name} size={38} />
                <Body>
                  <Who>
                    {incoming ? `${name} offered you` : `You offered ${name}`}{" "}
                    {summariseSide(sides.receiving)}
                  </Who>
                  <What>for {summariseSide(sides.giving)}</What>
                </Body>
                <Meta>
                  {trade.status === EffectiveTradeStatus.Pending
                    ? describeExpiry(trade.expiresAt)
                    : STATUS_LABEL[trade.status]}
                </Meta>
              </Row>
            );
          })}
        </List>
      )}

      {hasMore && (
        <Footer>
          <Button
            variant="secondary"
            onClick={() => setLimit((n) => n + PAGE_SIZE)}
          >
            Load more
          </Button>
        </Footer>
      )}
    </Container>
  );
};
