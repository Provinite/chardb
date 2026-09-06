import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { CharacterGrid } from "../components/CharacterGrid";
import { Pager } from "../components/pagination/Pager";
import { useOffsetPaging } from "../hooks/useOffsetPaging";
import { useAuth } from "../contexts/AuthContext";
import { useGetMyCharactersQuery } from "../generated/graphql";

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

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  opacity: 0.5;
`;

const EmptyTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const EmptyDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
`;

const CreateButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
  }
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

/**
 * How many to ask for, and to fetch on each Load More.
 *
 * Stated rather than left to the server's default, which is what this page
 * used to do: `CharacterFiltersInput.limit` defaults to 20, so the page showed
 * twenty characters and said nothing about the rest. A page size is a decision
 * about this screen, and it should be made on this screen.
 */
const PAGE_SIZE = 24;

export const MyCharactersPage: React.FC = () => {
  const { user } = useAuth();

  const { data, loading, error, fetchMore } = useGetMyCharactersQuery({
    variables: { filters: { limit: PAGE_SIZE, offset: 0 } },
    skip: !user,
  });

  const myCharacters = data?.myCharacters?.characters || [];

  const { loadMore, loadingMore } = useOffsetPaging({
    pageSize: PAGE_SIZE,
    loaded: myCharacters.length,
    hasMore: data?.myCharacters?.hasMore ?? false,
    load: ({ limit, offset }) =>
      fetchMore({
        variables: { filters: { limit, offset } },
        // Append rather than replace. Apollo replaces the cached result by
        // default, so without this Load More removes the characters it was
        // meant to add to.
        updateQuery: (previous, { fetchMoreResult }) =>
          fetchMoreResult
            ? {
                myCharacters: {
                  ...fetchMoreResult.myCharacters,
                  characters: [
                    ...previous.myCharacters.characters,
                    ...fetchMoreResult.myCharacters.characters,
                  ],
                },
              }
            : previous,
      }),
  });

  if (!user) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Please log in to view your characters</h3>
        </ErrorContainer>
      </Container>
    );
  }

  // `&& !data` so that Load More does not blank the page it is extending:
  // fetchMore sets `loading` too, and a full-page spinner there would take
  // away the characters already on screen along with the scroll position.
  if (loading && !data) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Error loading your characters</h3>
          <p>{error.message}</p>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>My Characters</Title>
        <Subtitle>Characters you've created and own</Subtitle>
      </Header>

      {myCharacters.length === 0 ? (
        <EmptyState>
          <EmptyIcon>🎭</EmptyIcon>
          <EmptyTitle>No characters yet</EmptyTitle>
          <EmptyDescription>
            You haven't created any characters yet. Create your first character
            to get started!
          </EmptyDescription>
          {/* This list spans every community, so there is no one community to
              create in -- pick one first. */}
          <CreateButton to="/my/communities">
            Create Your First Character
          </CreateButton>
        </EmptyState>
      ) : (
        <Pager
          showing={myCharacters.length}
          total={data?.myCharacters?.total ?? 0}
          hasMore={data?.myCharacters?.hasMore ?? false}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          noun="characters"
        >
          <CharacterGrid
            characters={myCharacters}
            showOwner={false}
            showEditButton={true}
          />
        </Pager>
      )}
    </Container>
  );
};

export default MyCharactersPage;
