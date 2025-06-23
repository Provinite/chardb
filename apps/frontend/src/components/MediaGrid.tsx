import React from 'react';
import styled from 'styled-components';
import { Media } from '../generated/graphql';
import { MediaCard } from './MediaCard';

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
  media: Media[];
  /** Whether to show owner information on each card */
  showOwner?: boolean;
  /** Whether the grid is currently loading */
  loading?: boolean;
  /** Custom message to show when no media is found */
  emptyMessage?: string;
  /** Custom description to show when no media is found */
  emptyDescription?: string;
}

/**
 * A responsive grid component for displaying media cards
 * Handles loading states and empty states automatically
 */
export const MediaGrid: React.FC<MediaGridProps> = ({
  media,
  showOwner = true,
  loading = false,
  emptyMessage = "No media found",
  emptyDescription = "Try adjusting your search or filters to find what you're looking for.",
}) => {
  if (loading) {
    return (
      <Grid>
        <LoadingState>
          Loading media...
        </LoadingState>
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
        />
      ))}
    </Grid>
  );
};