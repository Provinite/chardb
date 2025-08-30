import React, { useState, useCallback } from "react";
import { useQuery } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import {
  GET_GALLERIES,
  Gallery,
  GalleryFiltersInput,
} from "../graphql/galleries.graphql";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
    align-items: stretch;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const CreateButton = styled.button`
  padding: 0.75rem ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};

  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const SearchSection = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SearchForm = styled.form`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  flex: 1;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.75rem ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const SearchButton = styled.button`
  padding: 0.75rem ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};

  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const VisibilityFilter = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const VisibilityLabel = styled.span`
  margin-right: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const VisibilityButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== "active",
})<{ active: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 2px solid
    ${(props) =>
      props.active ? props.theme.colors.primary : props.theme.colors.border};
  background: ${(props) =>
    props.active ? props.theme.colors.primary : props.theme.colors.background};
  color: ${(props) =>
    props.active ? "white" : props.theme.colors.text.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const GalleryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const GalleryCard = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const GalleryName = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
`;

const GalleryDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.5;
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const GalleryMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const OwnerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const MetaContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: center;
`;

const ImageCount = styled.span`
  background: ${({ theme }) => theme.colors.surface};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const VisibilityBadge = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== "visibility",
})<{ visibility: string }>`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  background: ${(props) =>
    props.visibility === "PUBLIC"
      ? props.theme.colors.success + "20"
      : props.visibility === "UNLISTED"
        ? props.theme.colors.warning + "20"
        : props.theme.colors.error + "20"};
  color: ${(props) =>
    props.visibility === "PUBLIC"
      ? props.theme.colors.success
      : props.visibility === "UNLISTED"
        ? props.theme.colors.warning
        : props.theme.colors.error};
`;

const CharacterBadge = styled.span`
  background: ${({ theme }) => theme.colors.primary + "20"};
  color: ${({ theme }) => theme.colors.primary};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const LoadMoreButton = styled.button`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.secondary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.text.muted};
    cursor: not-allowed;
  }
`;

const ResultsCount = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.error};

  h3 {
    margin-bottom: ${({ theme }) => theme.spacing.sm};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xxl};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl}
    ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.text.muted};

  h3 {
    font-size: ${({ theme }) => theme.typography.fontSize.xxl};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  p {
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    line-height: 1.5;
  }
`;

export const GalleriesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState<GalleryFiltersInput>({
    limit: 12,
    offset: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<
    "ALL" | "PUBLIC" | "UNLISTED" | "PRIVATE"
  >("ALL");

  const { data, loading, error, fetchMore } = useQuery(GET_GALLERIES, {
    variables: { filters },
    notifyOnNetworkStatusChange: true,
  });

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setFilters((prev) => ({
        ...prev,
        offset: 0,
        visibility:
          visibilityFilter === "ALL" ? undefined : (visibilityFilter as any),
      }));
    },
    [searchTerm, visibilityFilter],
  );

  const handleLoadMore = useCallback(() => {
    if (data?.galleries.hasMore) {
      fetchMore({
        variables: {
          filters: {
            ...filters,
            offset: data.galleries.galleries.length,
          },
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            galleries: {
              ...fetchMoreResult.galleries,
              galleries: [
                ...prev.galleries.galleries,
                ...fetchMoreResult.galleries.galleries,
              ],
            },
          };
        },
      });
    }
  }, [data, filters, fetchMore]);

  const handleGalleryClick = useCallback(
    (galleryId: string) => {
      navigate(`/gallery/${galleryId}`);
    },
    [navigate],
  );

  const handleGalleryKeyDown = useCallback(
    (e: React.KeyboardEvent, galleryId: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleGalleryClick(galleryId);
      }
    },
    [handleGalleryClick],
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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

  return (
    <Container>
      <Header>
        <Title>Browse Galleries</Title>
        {user && (
          <CreateButton onClick={() => navigate("/gallery/create")}>
            Create Gallery
          </CreateButton>
        )}
      </Header>

      <SearchSection>
        <SearchForm onSubmit={handleSearch}>
          <SearchInput
            type="text"
            placeholder="Search galleries by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <SearchButton type="submit">Search</SearchButton>
        </SearchForm>
      </SearchSection>

      <VisibilityFilter>
        <VisibilityLabel>Visibility:</VisibilityLabel>
        {(["ALL", "PUBLIC", "UNLISTED"] as const).map((visibility) => (
          <VisibilityButton
            key={visibility}
            active={visibilityFilter === visibility}
            onClick={() => setVisibilityFilter(visibility)}
            aria-label={`Filter by ${visibility.toLowerCase()} galleries`}
          >
            {visibility}
          </VisibilityButton>
        ))}
      </VisibilityFilter>

      {loading && !data ? (
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      ) : (
        <>
          {data?.galleries && (
            <ResultsCount>
              Showing {data.galleries.galleries.length} of{" "}
              {data.galleries.total} galleries
            </ResultsCount>
          )}

          {data?.galleries.galleries.length === 0 ? (
            <EmptyState>
              <h3>No galleries found</h3>
              <p>
                Try adjusting your search terms or filters to find what you're
                looking for.
              </p>
            </EmptyState>
          ) : (
            <GalleryGrid>
              {data?.galleries.galleries.map((gallery: Gallery) => (
                <GalleryCard
                  key={gallery.id}
                  onClick={() => handleGalleryClick(gallery.id)}
                  onKeyDown={(e) => handleGalleryKeyDown(e, gallery.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View gallery ${gallery.name}`}
                >
                  <GalleryName>{gallery.name}</GalleryName>
                  {gallery.description && (
                    <GalleryDescription>
                      {gallery.description}
                    </GalleryDescription>
                  )}

                  <GalleryMeta>
                    <OwnerInfo>
                      by {gallery.owner.displayName || gallery.owner.username}
                      <span>• {formatDate(gallery.createdAt)}</span>
                    </OwnerInfo>
                    <MetaContainer>
                      {gallery._count && (
                        <ImageCount>{gallery._count.media} media</ImageCount>
                      )}
                      {gallery.character && (
                        <CharacterBadge>
                          {gallery.character.name}
                        </CharacterBadge>
                      )}
                      <VisibilityBadge visibility={gallery.visibility}>
                        {gallery.visibility}
                      </VisibilityBadge>
                    </MetaContainer>
                  </GalleryMeta>
                </GalleryCard>
              ))}
            </GalleryGrid>
          )}

          {data?.galleries.hasMore && (
            <LoadMoreButton onClick={handleLoadMore} disabled={loading}>
              {loading ? "Loading..." : "Load More Galleries"}
            </LoadMoreButton>
          )}
        </>
      )}
    </Container>
  );
};
