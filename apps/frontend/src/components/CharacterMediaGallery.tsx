import React, { useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Button } from "@chardb/ui";
import { MediaType, useGetCharacterMediaQuery } from "../generated/graphql";
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

const FilterTab = styled.button<{ active: boolean }>`
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

const CreateMediaModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.muted};
  padding: ${({ theme }) => theme.spacing.xs};
  
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const CreateOptions = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: center;
`;

const CreateOption = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text.primary};
  transition: all 0.2s;
  min-width: 120px;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const CreateIcon = styled.div`
  font-size: 2rem;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const CreateLabel = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

type MediaFilter = 'all' | 'images' | 'text';

interface CharacterMediaGalleryProps {
  characterId: string;
  canUpload?: boolean;
  limit?: number;
}

export const CharacterMediaGallery: React.FC<CharacterMediaGalleryProps> = ({
  characterId,
  canUpload = false,
  limit = 8,
}) => {
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const media = data?.characterMedia?.media || [];
  const totalCount = data?.characterMedia?.total || 0;
  const hasMore = data?.characterMedia?.hasMore || false;

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

  const imageCount = data?.characterMedia?.media?.filter((m: any) => m.mediaType === MediaType.Image)?.length || 0;
  const textCount = data?.characterMedia?.media?.filter((m: any) => m.mediaType === MediaType.Text)?.length || 0;

  return (
    <GalleryContainer>
      <GalleryHeader>
        <SectionTitle>Media Gallery</SectionTitle>
        <HeaderActions>
          {canUpload && (
            <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
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
        media={media as any[]}
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

      {showCreateModal && (
        <CreateMediaModal onClick={() => setShowCreateModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Add New Media</ModalTitle>
              <CloseButton onClick={() => setShowCreateModal(false)}>
                ×
              </CloseButton>
            </ModalHeader>
            <CreateOptions>
              <CreateOption to={`/upload?character=${characterId}`}>
                <CreateIcon>🖼️</CreateIcon>
                <CreateLabel>Upload Image</CreateLabel>
              </CreateOption>
              <CreateOption to={`/text/create?character=${characterId}`}>
                <CreateIcon>📝</CreateIcon>
                <CreateLabel>Create Text</CreateLabel>
              </CreateOption>
            </CreateOptions>
          </ModalContent>
        </CreateMediaModal>
      )}
    </GalleryContainer>
  );
};