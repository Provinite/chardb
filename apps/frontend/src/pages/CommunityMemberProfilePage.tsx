import React from "react";
import { useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { Avatar } from "@chardb/ui";
import {
  Package,
  ArrowLeftRight,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { CharacterGrid } from "../components/CharacterGrid";
import {
  useCommunityByIdQuery,
  useCommunityMemberRolesQuery,
  useGetUserProfileQuery,
  useUserCharactersQuery,
} from "../generated/graphql";

/**
 * One person, seen from inside one community.
 *
 * The site already has `/user/:username`, and it is deliberately global: it
 * knows nothing about communities and cannot, because it does not know which
 * one you came from. So everything a community actually wants to say about a
 * member -- what their role here is called, what they hold here, what they own
 * here, whether you can trade with them -- had nowhere to live, and the pages
 * that did hold it were reachable only by already being on a list (#349).
 *
 * This is that page. It owns no data of its own: it is a junction, and its job
 * is to be the thing you land on when you click a person's name.
 */

const CHARACTER_PREVIEW_LIMIT = 8;

const Container = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: 1rem;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Header = styled.div`
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.background};
  padding: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const Identity = styled.div`
  flex: 1;
  min-width: 0;
`;

const Name = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Handle = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: 0.15rem;
`;

const RoleTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.75rem;
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

const Bio = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.9375rem;
  line-height: 1.5;
  margin: 0.9rem 0 0 0;
  white-space: pre-wrap;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.1rem;
`;

const Action = styled(Link)<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.45rem 0.9rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid
    ${({ theme, $primary }) =>
      $primary ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $primary }) =>
    $primary ? `${theme.colors.primary}14` : theme.colors.background};
  color: ${({ theme, $primary }) =>
    $primary ? theme.colors.primary : theme.colors.text.secondary};

  &:hover {
    background: ${({ theme, $primary }) =>
      $primary ? `${theme.colors.primary}24` : theme.colors.surface};
    color: ${({ theme, $primary }) =>
      $primary ? theme.colors.primary : theme.colors.text.primary};
  }
`;

const Section = styled.section`
  margin-bottom: 2rem;
`;

const SectionHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const SectionLink = styled(Link)`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Empty = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

export const CommunityMemberProfilePage: React.FC = () => {
  const { communityId, username } = useParams<{
    communityId: string;
    username: string;
  }>();
  const { user } = useAuth();

  const { data: communityData } = useCommunityByIdQuery({
    variables: { id: communityId! },
    skip: !communityId,
  });

  const { data: profileData, loading: profileLoading } = useGetUserProfileQuery(
    {
      variables: { username: username ?? "" },
      skip: !username,
    },
  );

  const member = profileData?.userProfile?.user;
  const memberId = member?.id;
  const isSelf = memberId === user?.id;

  const { data: rolesData } = useCommunityMemberRolesQuery({
    variables: { communityId: communityId!, userId: memberId ?? "" },
    skip: !communityId || !memberId,
  });

  // Their characters *here*, not everywhere. A member of three communities
  // has three different answers to "what do you own", and the one worth
  // showing is the one belonging to the community you are standing in.
  const { data: charactersData, loading: charactersLoading } =
    useUserCharactersQuery({
      variables: {
        userId: memberId ?? "",
        filters: { communityId, limit: CHARACTER_PREVIEW_LIMIT, offset: 0 },
      },
      skip: !memberId || !communityId,
    });

  if (profileLoading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
      </LoadingContainer>
    );
  }

  if (!member) {
    return (
      <Container>
        <Empty>
          <p>No such member. They may have changed their username or left.</p>
        </Empty>
      </Container>
    );
  }

  const roles = rolesData?.communityMemberRoles ?? [];
  const characters = charactersData?.userCharacters?.characters ?? [];
  const characterTotal = charactersData?.userCharacters?.total ?? 0;
  const displayName = member.displayName || member.username;
  const communityName = communityData?.community?.name || "this community";

  return (
    <Container>
      <BackLink to={`/communities/${communityId}/members`}>
        <ChevronLeft size={14} /> Members of {communityName}
      </BackLink>

      <Header>
        <Avatar image={member.avatarImage} name={displayName} size={88} />
        <Identity>
          <Name>{displayName}</Name>
          <Handle>@{member.username}</Handle>

          {roles.length > 0 && (
            <RoleTags data-testid="member-role-tags">
              {roles.map((role) => (
                <RoleTag key={role.id}>{role.name}</RoleTag>
              ))}
            </RoleTags>
          )}

          {member.bio && <Bio>{member.bio}</Bio>}

          <Actions>
            {/* The reason this page exists. Primary on purpose: the whole
                complaint in #349 was that reaching someone's inventory took
                knowing a URL. */}
            <Action
              $primary
              to={`/communities/${communityId}/members/${member.username}/inventory`}
              data-testid="member-inventory-link"
            >
              <Package size={15} />
              {isSelf ? "Your inventory" : "Inventory"}
            </Action>
            {/* Hidden on your own profile: the server refuses a trade with
                yourself, so offering the button would be a dead end. */}
            {!isSelf && (
              <Action
                to={`/communities/${communityId}/trades/new?with=${member.id}`}
              >
                <ArrowLeftRight size={15} /> Propose trade
              </Action>
            )}
            <Action to={`/user/${member.username}`}>
              <ExternalLink size={15} /> Site profile
            </Action>
          </Actions>
        </Identity>
      </Header>

      <Section>
        <SectionHead>
          <SectionTitle>
            Characters in {communityName}
            {characterTotal > 0 && ` (${characterTotal})`}
          </SectionTitle>
          {characterTotal > characters.length && (
            <SectionLink to={`/user/${member.username}/characters`}>
              All of their characters
            </SectionLink>
          )}
        </SectionHead>

        {charactersLoading ? (
          <LoadingSpinner />
        ) : characters.length === 0 ? (
          <Empty>Nothing here yet.</Empty>
        ) : (
          <CharacterGrid characters={characters} showOwner={false} />
        )}
      </Section>
    </Container>
  );
};
