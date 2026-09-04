import React from "react";
import { useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { Pager } from "../components/pagination/Pager";
import { useOffsetPaging } from "../hooks/useOffsetPaging";
import {
  useUserIdentityQuery,
  useUserGalleriesQuery,
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

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s ease-in-out;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CardMeta = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CardDescription = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
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
 * Every gallery one member owns.
 *
 * The sibling of `UserCharactersPage`, and broken the same way for the same
 * reason: the profile linked `/galleries?owner=<username>`, and `GalleriesPage`
 * does not read the URL at all -- no `useSearchParams`, filters seeded from a
 * `useState` literal. Fixing the parameter name there would have changed
 * nothing, which is why this is a page rather than a parser.
 */
export const UserGalleriesPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();

  const { data: identity, loading: identityLoading } = useUserIdentityQuery({
    variables: { username: username! },
    skip: !username,
  });

  const user = identity?.user;

  const { data, loading, error, fetchMore } = useUserGalleriesQuery({
    variables: {
      userId: user?.id ?? "",
      filters: { limit: PAGE_SIZE, offset: 0 },
    },
    skip: !user?.id,
  });

  const galleries = data?.userGalleries?.galleries ?? [];
  const total = data?.userGalleries?.total ?? 0;

  const { loadMore, loadingMore } = useOffsetPaging({
    pageSize: PAGE_SIZE,
    loaded: galleries.length,
    hasMore: data?.userGalleries?.hasMore ?? false,
    load: ({ limit, offset }) =>
      fetchMore({
        variables: { filters: { limit, offset } },
        updateQuery: (previous, { fetchMoreResult }) =>
          fetchMoreResult
            ? {
                userGalleries: {
                  ...fetchMoreResult.userGalleries,
                  galleries: [
                    ...previous.userGalleries.galleries,
                    ...fetchMoreResult.userGalleries.galleries,
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
          <h3>Error loading galleries</h3>
          <p>{error.message}</p>
        </ErrorContainer>
      </Container>
    );
  }

  const displayName = user?.displayName || user?.username;

  return (
    <Container data-testid="user-galleries-page">
      <Header>
        <Title>{displayName}'s Galleries</Title>
        <BackLink to={`/user/${user?.username}`}>
          &larr; Back to profile
        </BackLink>
      </Header>

      {galleries.length === 0 ? (
        <EmptyState>
          <h3>Nothing to show</h3>
          <p>{displayName} has no galleries you can see.</p>
        </EmptyState>
      ) : (
        <Pager
          showing={galleries.length}
          total={total}
          hasMore={data?.userGalleries?.hasMore ?? false}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          noun="galleries"
        >
          <Grid>
            {galleries.map((gallery) => (
              <Card
                key={gallery.id}
                to={`/gallery/${gallery.id}`}
                data-testid="gallery-card"
                data-gallery-id={gallery.id}
              >
                <CardTitle>{gallery.name}</CardTitle>
                <CardMeta>
                  {gallery._count?.media ?? 0} media
                  {gallery.character ? ` · ${gallery.character.name}` : ""}
                </CardMeta>
                {gallery.description && (
                  <CardDescription>{gallery.description}</CardDescription>
                )}
              </Card>
            ))}
          </Grid>
        </Pager>
      )}
    </Container>
  );
};
