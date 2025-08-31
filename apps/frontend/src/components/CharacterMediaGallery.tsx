import React, { useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Button } from "@chardb/ui";
import { MediaType, useGetCharacterMediaQuery, useSetCharacterMainMediaMutation } from "../generated/graphql";
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
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.border};
  background: ${props => props.active ? props.theme.colors.primary : props.theme.colors.background};
  color: ${props => props.active ? 'white' : props.theme.colors.text.secondary};
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


type MediaFilter = 'all' | 'images' | 'text';

interface CharacterMediaGalleryProps {
  /** ID of the character whose media to display */
  characterId: string;
  /** Whether the current user can upload media to this character */
  canUpload?: boolean;
  /** Maximum number of media items to display */
  limit?: number;
  /** Current main media ID for the character */
  currentMainMediaId?: string;
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
}) => {
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [isSettingMain, setIsSettingMain] = useState(false);

  const { data, loading, error } = useGetCharacterMediaQuery({
    variables: {
      characterId,
      filters: {
        limit,
        mediaType: mediaFilter === 'all' ? undefined : 
                  mediaFilter === 'images' ? MediaType.Image : MediaType.Text,
      },
    },
  });

  // Get total counts (without media type filter)
  const { data: countsData } = useGetCharacterMediaQuery({
    variables: {
      characterId,
      filters: {
        limit: 1, // Minimum valid limit - we only need the counts, not the actual media
      },
    },
  });

  const [setCharacterMainMedia] = useSetCharacterMainMediaMutation({
    refetchQueries: ['GetCharacter', 'GetCharacterMedia'],
  });

  const media = data?.characterMedia?.media || [];
  const totalCount = countsData?.characterMedia?.total || 0;
  const imageCount = countsData?.characterMedia?.imageCount || 0;
  const textCount = countsData?.characterMedia?.textCount || 0;
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
      toast.success('Main image updated successfully');
    } catch (error) {
      console.error('Failed to set main media:', error);
      toast.error('Failed to update main image');
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
      toast.success('Main image removed successfully');
    } catch (error) {
      console.error('Failed to remove main media:', error);
      toast.error('Failed to remove main image');
    } finally {
      setIsSettingMain(false);
    }
  };

  if (error) {
    toast.error('Failed to load media');
    return (
      <GalleryContainer>
        <EmptyState>
          <p>Failed to load media. Please try again.</p>
        </EmptyState>
      </GalleryContainer>
    );
  }

  if (loading) {
    return (
      <GalleryContainer>
        <LoadingState>
          Loading media...
        </LoadingState>
      </GalleryContainer>
    );
  }


  return (
    <GalleryContainer>
      <GalleryHeader>
        <SectionTitle>Media Gallery</SectionTitle>
        <HeaderActions>
          {canUpload && (
            <Button as={Link} to={`/upload?character=${characterId}`} variant="primary" size="sm">
              Add Media
            </Button>
          )}
          {hasMore && (
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
            active={mediaFilter === 'all'}
            onClick={() => setMediaFilter('all')}
          >
            All ({totalCount})
          </FilterTab>
          <FilterTab
            active={mediaFilter === 'images'}
            onClick={() => setMediaFilter('images')}
          >
            Images ({imageCount})
          </FilterTab>
          <FilterTab
            active={mediaFilter === 'text'}
            onClick={() => setMediaFilter('text')}
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
          mediaFilter === 'all' 
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
          <Link to={`/character/${characterId}/media`}>
            <Button variant="primary" size="md">
              View All Media ({totalCount})
            </Button>
          </Link>
        </ViewAllContainer>
      )}

    </GalleryContainer>
  );
};