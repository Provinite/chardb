import React from 'react';
import styled from 'styled-components';
import { Media } from '../generated/graphql';
import { MediaCard } from './MediaCard';

// Define the minimal Media type that MediaGrid actually needs
export type MediaGridItem = Pick<
  Media,
  'id' | 'title' | 'description' | 'visibility'
> & {
  owner: Pick<Media['owner'], 'displayName' | 'username'>;
  image: Media['image'] extends null
    ? null
    : Pick<
        NonNullable<Media['image']>,
        'url' | 'thumbnailUrl' | 'altText'
      > | null;
  textContent: Media['textContent'] extends null
    ? null
    : Pick<NonNullable<Media['textContent']>, 'content' | 'wordCount'> | null;
};

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.text.muted};
  grid-column: 1 / -1;

  h3 {
    font-size: ${({ theme }) => theme.typography.fontSize.xl};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  p {
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    line-height: 1.5;
  }
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  grid-column: 1 / -1;
  color: ${({ theme }) => theme.colors.text.muted};
`;

interface MediaGridProps {
  /** Array of media items to display */
  media: MediaGridItem[];
  /** Whether to show owner information on each card */
  showOwner?: boolean;
  /** Whether the grid is currently loading */
  loading?: boolean;
  /** Custom message to show when no media is found */
  emptyMessage?: string;
  /** Custom description to show when no media is found */
  emptyDescription?: string;
  /** Character ID if this is being displayed on a character page (enables Set as Main functionality) */
  characterId?: string;
  /** ID of the current main media for the character */
  currentMainMediaId?: string;
  /** Callback when Set as Main button is clicked */
  onSetAsMain?: (mediaId: string) => void;
  /** Callback when Remove as Main button is clicked */
  onRemoveAsMain?: () => void;
  /** Whether the Set as Main action is currently loading */
  isSettingMain?: boolean;
}

/**
 * A responsive grid component for displaying media cards
 * Handles loading states and empty states automatically
 */
export const MediaGrid: React.FC<MediaGridProps> = ({
  media,
  showOwner = true,
  loading = false,
  emptyMessage = 'No media found',
  emptyDescription = "Try adjusting your search or filters to find what you're looking for.",
  characterId,
  currentMainMediaId,
  onSetAsMain,
  onRemoveAsMain,
  isSettingMain = false,
}) => {
  if (loading) {
    return (
      <Grid>
        <LoadingState>Loading media...</LoadingState>
      </Grid>
    );
  }

  if (!media || media.length === 0) {
    return (
      <Grid>
        <EmptyState>
          <h3>{emptyMessage}</h3>
          <p>{emptyDescription}</p>
        </EmptyState>
      </Grid>
    );
  }

  return (
    <Grid>
      {media.map((item) => (
        <MediaCard
          key={item.id}
          media={item}
          showOwner={showOwner}
          characterId={characterId}
          currentMainMediaId={currentMainMediaId}
          onSetAsMain={onSetAsMain}
          onRemoveAsMain={onRemoveAsMain}
          isSettingMain={isSettingMain}
        />
      ))}
    </Grid>
  );
};
