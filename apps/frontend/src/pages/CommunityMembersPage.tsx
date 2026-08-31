import React, { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { Avatar } from "@chardb/ui";
import { Users, Search, Package, ArrowLeftRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  useCommunityByIdQuery,
  useCommunityMembersWithRolesQuery,
} from "../generated/graphql";

/**
 * Who is in this community, and what each of them holds.
 *
 * Replaces a placeholder that said member management was "under development".
 * It is a list rather than a management surface: roles are edited on the
 * permissions page, and this exists so a member's holdings are reachable by
 * clicking rather than by typing a URL.
 */

const PAGE_SIZE = 50;

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
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const SearchWrap = styled.div`
  position: relative;
  max-width: 320px;
  margin-bottom: 1.25rem;

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

const List = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.background};
  overflow: hidden;
`;

const MemberRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const Who = styled.div`
  min-width: 0;
  flex: 1;
`;

const Name = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Handle = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const RoleTag = styled.span`
  font-size: 0.6875rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-weight: 600;
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.muted};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  padding: 0.1rem 0.4rem;
  white-space: nowrap;
`;

const ItemsLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.35rem 0.7rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
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

export const CommunityMembersPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: communityData } = useCommunityByIdQuery({
    variables: { id: communityId! },
    skip: !communityId,
  });

  const { data, loading, error } = useCommunityMembersWithRolesQuery({
    variables: { communityId: communityId!, first: limit },
    skip: !communityId,
  });

  const members = useMemo(
    () => data?.communityMembersByCommunity?.nodes ?? [],
    [data],
  );

  // Filtered here rather than server-side: the query takes no search argument,
  // and a community's membership is small enough that fetching a page and
  // narrowing it beats adding an API surface for it.
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.user.username.toLowerCase().includes(q) ||
        (m.user.displayName ?? "").toLowerCase().includes(q) ||
        m.role.name.toLowerCase().includes(q),
    );
  }, [members, search]);

  const total = data?.communityMembersByCommunity?.totalCount ?? 0;
  const hasMore = data?.communityMembersByCommunity?.hasNextPage ?? false;

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
            That member list could not be loaded. It may belong to a community
            you are not a member of. {error.message}
          </p>
        </Empty>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Members</Title>
        <Subtitle>
          Everyone in {communityData?.community?.name || "this community"}
        </Subtitle>
      </Header>

      <SearchWrap>
        <Search size={15} />
        <SearchInput
          type="search"
          aria-label="Search members"
          placeholder="Search by name or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </SearchWrap>

      {shown.length === 0 ? (
        <Empty>
          <Users size={36} style={{ opacity: 0.5, marginBottom: "0.75rem" }} />
          <p>
            {search
              ? "No members match that search."
              : "This community has no members yet."}
          </p>
        </Empty>
      ) : (
        <List data-testid="member-list">
          {shown.map((m) => {
            const name = m.user.displayName || m.user.username;
            return (
              <MemberRow
                key={m.id}
                data-testid="member-row"
                data-username={m.user.username}
              >
                <Avatar image={m.user.avatarImage} name={name} size={36} />
                <Who>
                  <Name>
                    <Link to={`/user/${m.user.username}`}>{name}</Link>
                  </Name>
                  {m.user.displayName && <Handle>@{m.user.username}</Handle>}
                </Who>
                <RoleTag>{m.role.name}</RoleTag>
                <ItemsLink
                  to={`/communities/${communityId}/members/${m.user.username}/items`}
                >
                  <Package size={14} /> Items
                </ItemsLink>
                {/* Hidden on your own row: the server refuses a trade with
                    yourself, so offering the button would be a dead end. */}
                {m.user.id !== user?.id && (
                  <ItemsLink
                    to={`/communities/${communityId}/trades/new?with=${m.user.id}`}
                  >
                    <ArrowLeftRight size={14} /> Trade
                  </ItemsLink>
                )}
              </MemberRow>
            );
          })}
        </List>
      )}

      <Footer>
        <span>
          Showing {shown.length}
          {search ? ` of ${members.length} loaded` : ""} of {total} member
          {total === 1 ? "" : "s"}
        </span>
        {hasMore && !search && (
          <MoreButton
            type="button"
            disabled={loading}
            onClick={() => setLimit((n) => n + PAGE_SIZE)}
          >
            {loading ? "Loading…" : "Load more"}
          </MoreButton>
        )}
      </Footer>
    </Container>
  );
};
