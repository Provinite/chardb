import React, { useState } from "react";
import styled, { css } from "styled-components";
import { useParams, Link } from "react-router-dom";
import { Package, ChevronDown } from "lucide-react";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";
import {
  useCommunityByIdQuery,
  useGetMemberHoldingsQuery,
  useGetUserProfileQuery,
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
            const open = expanded.has(h.itemType.id);
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
                  <Expand
                    type="button"
                    $open={open}
                    data-testid="expand-group"
                    onClick={() => toggleGroup(h.itemType.id)}
                  >
                    {open ? "Hide" : "Show"} items
                    <ChevronDown size={14} />
                  </Expand>
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
                      </ItemRow>
                    ))}
                  </Items>
                )}
              </Group>
            );
          })}
        </div>
      )}
    </Container>
  );
};
