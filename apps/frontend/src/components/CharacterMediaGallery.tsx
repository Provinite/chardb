import React, { useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Button } from "@chardb/ui";
import {
  MediaType,
  useGetCharacterMediaQuery,
  useSetCharacterMainMediaMutation,
} from "../generated/graphql";
import { MediaGrid } from "./MediaGrid";
import toast from "react-hot-toast";

const GalleryContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const GalleryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: center;
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
`;

const FilterTabs = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const FilterTab = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== "active",
})<{ active: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid
    ${(props) =>
      props.active ? props.theme.colors.primary : props.theme.colors.border};
  background: ${(props) =>
    props.active ? props.theme.colors.primary : props.theme.colors.background};
  color: ${(props) =>
    props.active ? "white" : props.theme.colors.text.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  cursor: pointer;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: all 0.2s;

  &:hover:not([data-active="true"]) {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primary}10;
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const ViewAllContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.text.muted};
  font-style: italic;

  p {
    margin: 0;
    font-size: ${({ theme }) => theme.typography.fontSize.md};
  }
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.text.muted};
`;

type MediaFilter = "all" | "images" | "text";

interface CharacterMediaGalleryProps {
  /** ID of the character whose media to display */
  characterId: string;
  /** Whether the current user can upload media to this character */
  canUpload?: boolean;
  /** How many media to show at a time. "Load more" adds another batch. */
  limit?: number;
  /** Current main media ID for the character */
  currentMainMediaId?: string;
  /**
   * Whether to offer the link to the character's full media page. Off on that
   * page itself, which would otherwise link to where you already are.
   */
  showViewAll?: boolean;
}

/**
 * A component that displays a character's media with filtering and upload capabilities
 * Supports both image and text media with type-specific filtering
 */
export const CharacterMediaGallery: React.FC<CharacterMediaGalleryProps> = ({
  characterId,
  canUpload = false,
  limit = 8,
  currentMainMediaId,
  showViewAll = true,
}) => {
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [isSettingMain, setIsSettingMain] = useState(false);
  // Grows by `limit` each time. Asking for a bigger page rather than fetching
  // an offset keeps this to one query with no cache merge function -- the only
  // pagination policy in this app appends unconditionally, and copying that
  // here would be a bug rather than a pattern.
  const [shown, setShown] = useState(limit);

  // Reset when the filter changes: eight images and eight text entries are
  // different lists, and carrying a grown page size across would show a
  // different amount of one than the other.
  const showFilter = (next: MediaFilter) => {
    setMediaFilter(next);
    setShown(limit);
  };

  const { data, loading, error } = useGetCharacterMediaQuery({
    variables: {
      characterId,
      filters: {
        limit: shown,
        mediaType:
          mediaFilter === "all"
            ? undefined
            : mediaFilter === "images"
              ? MediaType.Image
              : MediaType.Text,
      },
    },
  });

  // The tab counts are of everything, but the query above counts only what its
  // own filter matched -- ask it for images and it reports no text at all. So
  // an unfiltered copy is needed, and only when a filter is actually on: with
  // "all" the query above already answers this, and asking twice was a second
  // round trip for numbers we were holding.
  const { data: countsData } = useGetCharacterMediaQuery({
    variables: { characterId, filters: { limit: 1 } },
    skip: mediaFilter === "all",
  });

  const [setCharacterMainMedia] = useSetCharacterMainMediaMutation({
    refetchQueries: ["GetCharacter", "GetCharacterMedia"],
  });

  const media = data?.characterMedia?.media || [];
  // Unfiltered either way: from this query when nothing is filtered, from the
  // counts query when something is.
  const counts =
    mediaFilter === "all" ? data?.characterMedia : countsData?.characterMedia;
  const totalCount = counts?.total || 0;
  const imageCount = counts?.imageCount || 0;
  const textCount = counts?.textCount || 0;
  const hasMore = data?.characterMedia?.hasMore || false;

  const handleSetAsMain = async (mediaId: string) => {
    if (!canUpload) return;

    setIsSettingMain(true);
    try {
      await setCharacterMainMedia({
        variables: {
          id: characterId,
          input: { mediaId },
        },
      });
      toast.success("Main image updated successfully");
    } catch (error) {
      console.error("Failed to set main media:", error);
      toast.error("Failed to update main image");
    } finally {
      setIsSettingMain(false);
    }
  };

  const handleRemoveAsMain = async () => {
    if (!canUpload) return;

    setIsSettingMain(true);
    try {
      await setCharacterMainMedia({
        variables: {
          id: characterId,
          input: { mediaId: null },
        },
      });
      toast.success("Main image removed successfully");
    } catch (error) {
      console.error("Failed to remove main media:", error);
      toast.error("Failed to remove main image");
    } finally {
      setIsSettingMain(false);
    }
  };

  if (error) {
    toast.error("Failed to load media");
    return (
      <GalleryContainer>
        <EmptyState>
          <p>Failed to load media. Please try again.</p>
        </EmptyState>
      </GalleryContainer>
    );
  }

  // Only before anything has arrived. Loading is also true while a bigger page
  // is being fetched, and replacing the gallery with "Loading media..." every
  // time somebody asks for more would make the button feel like it lost their
  // place.
  if (loading && !data) {
    return (
      <GalleryContainer>
        <LoadingState>Loading media...</LoadingState>
      </GalleryContainer>
    );
  }

  return (
    <GalleryContainer>
      <GalleryHeader>
        <SectionTitle>Media Gallery</SectionTitle>
        <HeaderActions>
          {canUpload && (
            <Button
              as={Link}
              to={`/upload?character=${characterId}`}
              variant="primary"
              size="sm"
            >
              Add Media
            </Button>
          )}
          {hasMore && showViewAll && (
            <Link to={`/character/${characterId}/media`}>
              <Button variant="ghost" size="sm">
                View All ({totalCount})
              </Button>
            </Link>
          )}
        </HeaderActions>
      </GalleryHeader>

      {totalCount > 0 && (
        <FilterTabs>
          <FilterTab
            active={mediaFilter === "all"}
            onClick={() => showFilter("all")}
          >
            All ({totalCount})
          </FilterTab>
          <FilterTab
            active={mediaFilter === "images"}
            onClick={() => showFilter("images")}
          >
            Images ({imageCount})
          </FilterTab>
          <FilterTab
            active={mediaFilter === "text"}
            onClick={() => showFilter("text")}
          >
            Text ({textCount})
          </FilterTab>
        </FilterTabs>
      )}

      <MediaGrid
        media={media}
        showOwner={false}
        loading={loading}
        emptyMessage={
          mediaFilter === "all"
            ? "No media uploaded yet for this character"
            : `No ${mediaFilter} uploaded yet for this character`
        }
        emptyDescription={
          canUpload
            ? "Upload some images or create text content to get started!"
            : "Check back later for updates."
        }
        characterId={canUpload ? characterId : undefined}
        currentMainMediaId={currentMainMediaId}
        onSetAsMain={canUpload ? handleSetAsMain : undefined}
        onRemoveAsMain={canUpload ? handleRemoveAsMain : undefined}
        isSettingMain={isSettingMain}
      />

      {hasMore && (
        <ViewAllContainer>
          <Button
            variant="secondary"
            size="md"
            data-testid="load-more-media"
            disabled={loading}
            onClick={() => setShown((current) => current + limit)}
          >
            {loading ? "Loading…" : "Load more"}
          </Button>
          {showViewAll && (
            <Link to={`/character/${characterId}/media`}>
              <Button variant="primary" size="md">
                View All Media ({totalCount})
              </Button>
            </Link>
          )}
        </ViewAllContainer>
      )}
    </GalleryContainer>
  );
};
