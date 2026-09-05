import React from "react";
import { useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { MediaGrid } from "../components/MediaGrid";
import { Pager } from "../components/pagination/Pager";
import { useOffsetPaging } from "../hooks/useOffsetPaging";
import {
  useUserIdentityQuery,
  useGetUserMediaQuery,
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
 * Every piece of media one member owns.
 *
 * The third of the profile's "View All" links, and the one #321 missed. It
 * pointed at `/images?uploader=<username>` -- a route that has never existed,
 * so it fell through to the catch-all and 404'd (#348). Its two siblings were
 * broken more quietly: they landed on an unfiltered global browse.
 *
 * Same division of labour as `UserCharactersPage` and `UserGalleriesPage`:
 * `userMedia` narrows by owner AND by who is asking, so a visitor never sees
 * what the owner has kept back, and the page never holds media it is not
 * allowed to draw.
 */
export const UserMediaPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();

  const { data: identity, loading: identityLoading } = useUserIdentityQuery({
    variables: { username: username! },
    skip: !username,
  });

  const user = identity?.user;

  const { data, loading, error, fetchMore } = useGetUserMediaQuery({
    variables: {
      userId: user?.id ?? "",
      filters: { limit: PAGE_SIZE, offset: 0 },
    },
    skip: !user?.id,
  });

  const media = data?.userMedia?.media ?? [];
  const total = data?.userMedia?.total ?? 0;

  const { loadMore, loadingMore } = useOffsetPaging({
    pageSize: PAGE_SIZE,
    loaded: media.length,
    hasMore: data?.userMedia?.hasMore ?? false,
    load: ({ limit, offset }) =>
      fetchMore({
        variables: { filters: { limit, offset } },
        updateQuery: (previous, { fetchMoreResult }) =>
          fetchMoreResult
            ? {
                userMedia: {
                  ...fetchMoreResult.userMedia,
                  media: [
                    ...previous.userMedia.media,
                    ...fetchMoreResult.userMedia.media,
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
          <h3>Error loading media</h3>
          <p>{error.message}</p>
        </ErrorContainer>
      </Container>
    );
  }

  const displayName = user?.displayName || user?.username;

  return (
    <Container data-testid="user-media-page">
      <Header>
        <Title>{displayName}'s Media</Title>
        <BackLink to={`/user/${user?.username}`}>
          &larr; Back to profile
        </BackLink>
      </Header>

      {media.length === 0 ? (
        <EmptyState>
          <h3>Nothing to show</h3>
          <p>{displayName} has no media you can see.</p>
        </EmptyState>
      ) : (
        <Pager
          showing={media.length}
          total={total}
          hasMore={data?.userMedia?.hasMore ?? false}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          noun="media"
        >
          {/* showOwner={false}: every item here has the same owner, and it is
              named in the heading. */}
          <MediaGrid media={media} showOwner={false} />
        </Pager>
      )}
    </Container>
  );
};
