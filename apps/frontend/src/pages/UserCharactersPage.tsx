import React from "react";
import { useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { CharacterGrid } from "../components/CharacterGrid";
import { Pager } from "../components/pagination/Pager";
import { useOffsetPaging } from "../hooks/useOffsetPaging";
import {
  useUserIdentityQuery,
  useUserCharactersQuery,
} from "../generated/graphql";

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const BackLink = styled(Link)`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xxl};
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.error};
`;

const PAGE_SIZE = 24;

/**
 * Every character one member owns.
 *
 * The destination the profile's "View All" always claimed to have. It used to
 * point at `/characters?owner=<username>` -- a parameter the browse page does
 * not parse, carrying a username where the filter wants a UUID -- so it landed
 * on the unfiltered global browse and presented every character on the site as
 * that member's (#321, #214).
 *
 * The filtering is the server's: `userCharacters` narrows by owner AND by who
 * is asking, so a visitor never sees what the owner has kept back. Doing it
 * here instead would mean shipping someone's private characters to the browser
 * and trusting the page not to draw them.
 */
export const UserCharactersPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();

  const { data: identity, loading: identityLoading } = useUserIdentityQuery({
    variables: { username: username! },
    skip: !username,
  });

  const user = identity?.user;

  const { data, loading, error, fetchMore } = useUserCharactersQuery({
    variables: {
      userId: user?.id ?? "",
      filters: { limit: PAGE_SIZE, offset: 0 },
    },
    skip: !user?.id,
  });

  const characters = data?.userCharacters?.characters ?? [];
  const total = data?.userCharacters?.total ?? 0;

  const { loadMore, loadingMore } = useOffsetPaging({
    pageSize: PAGE_SIZE,
    loaded: characters.length,
    hasMore: data?.userCharacters?.hasMore ?? false,
    load: ({ limit, offset }) =>
      fetchMore({
        variables: { filters: { limit, offset } },
        // Append rather than replace, or Load More removes the characters it
        // was meant to add to.
        updateQuery: (previous, { fetchMoreResult }) =>
          fetchMoreResult
            ? {
                userCharacters: {
                  ...fetchMoreResult.userCharacters,
                  characters: [
                    ...previous.userCharacters.characters,
                    ...fetchMoreResult.userCharacters.characters,
                  ],
                },
              }
            : previous,
      }),
  });

  if (identityLoading || (loading && !data)) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (!identityLoading && !user) {
    return (
      <Container>
        <ErrorContainer>
          <h3>No such member</h3>
          <p>Nobody here goes by "{username}".</p>
        </ErrorContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Error loading characters</h3>
          <p>{error.message}</p>
        </ErrorContainer>
      </Container>
    );
  }

  const displayName = user?.displayName || user?.username;

  return (
    <Container data-testid="user-characters-page">
      <Header>
        {/* Named rather than "Browse Characters", which is what this grid says
            when it is showing everybody. A per-owner listing that does not say
            whose it is repeats the bug it exists to fix, just more quietly. */}
        <Title>{displayName}'s Characters</Title>
        <BackLink to={`/user/${user?.username}`}>
          &larr; Back to profile
        </BackLink>
      </Header>

      {characters.length === 0 ? (
        <EmptyState>
          <h3>Nothing to show</h3>
          <p>{displayName} has no characters you can see.</p>
        </EmptyState>
      ) : (
        <Pager
          showing={characters.length}
          total={total}
          hasMore={data?.userCharacters?.hasMore ?? false}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          noun="characters"
        >
          {/* showOwner={false}: every card on this page has the same owner,
              and it is named in the heading. */}
          <CharacterGrid characters={characters} showOwner={false} />
        </Pager>
      )}
    </Container>
  );
};
