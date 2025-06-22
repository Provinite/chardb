import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Button } from "@chardb/ui";
import { GetCharacterQuery, useSetCharacterMainImageMutation } from "../generated/graphql";
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

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: ${({ theme }) => theme.spacing.sm};
  }
`;

const ImageCard = styled(Link)`
  position: relative;
  aspect-ratio: 1;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  text-decoration: none;
  display: block;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const ImageElement = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;

  ${ImageCard}:hover & {
    transform: scale(1.05);
  }
`;

const ImageOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: white;
  padding: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  opacity: 0;
  transition: opacity 0.2s ease;

  ${ImageCard}:hover & {
    opacity: 1;
  }
`;

const NSFWBadge = styled.span`
  position: absolute;
  top: ${({ theme }) => theme.spacing.xs};
  right: ${({ theme }) => theme.spacing.xs};
  background: ${({ theme }) => theme.colors.error};
  color: white;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  z-index: 2;
`;

const MainImageBadge = styled.span`
  position: absolute;
  top: ${({ theme }) => theme.spacing.xs};
  left: ${({ theme }) => theme.spacing.xs};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  z-index: 2;
`;

const ImageActions = styled.div`
  position: absolute;
  bottom: ${({ theme }) => theme.spacing.xs};
  left: ${({ theme }) => theme.spacing.xs};
  right: ${({ theme }) => theme.spacing.xs};
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 3;
`;

const ImageCardWrapper = styled.div`
  position: relative;
  aspect-ratio: 1;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    
    ${ImageActions} {
      opacity: 1;
    }
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

type ImageType = NonNullable<NonNullable<GetCharacterQuery["character"]>["recentImages"]>[0];

interface CharacterImageGalleryProps {
  characterId: string;
  images: ImageType[];
  totalCount: number;
  canUpload?: boolean;
  mainImageId?: string | null;
  isOwner?: boolean;
}

export const CharacterImageGallery: React.FC<CharacterImageGalleryProps> = ({
  characterId,
  images,
  totalCount,
  canUpload = false,
  mainImageId,
  isOwner = false,
}) => {
  const [setCharacterMainImage, { loading: settingMainImage }] = useSetCharacterMainImageMutation();

  const handleSetMainImage = async (imageId: string) => {
    try {
      await setCharacterMainImage({
        variables: {
          id: characterId,
          input: { imageId },
        },
        refetchQueries: ['GetCharacter'],
      });
      toast.success('Main image updated successfully!');
    } catch (error) {
      console.error('Error setting main image:', error);
      toast.error('Failed to set main image. Please try again.');
    }
  };

  const handleClearMainImage = async () => {
    try {
      await setCharacterMainImage({
        variables: {
          id: characterId,
          input: { imageId: null },
        },
        refetchQueries: ['GetCharacter'],
      });
      toast.success('Main image cleared successfully!');
    } catch (error) {
      console.error('Error clearing main image:', error);
      toast.error('Failed to clear main image. Please try again.');
    }
  };

  if (!images || images.length === 0) {
    return (
      <GalleryContainer>
        <GalleryHeader>
          <SectionTitle>Recent Images</SectionTitle>
          {canUpload && (
            <HeaderActions>
              <Link to={`/upload?character=${characterId}`}>
                <Button variant="primary" size="sm">
                  Upload Image
                </Button>
              </Link>
            </HeaderActions>
          )}
        </GalleryHeader>
        <EmptyState>
          <p>No images uploaded yet for this character.</p>
        </EmptyState>
      </GalleryContainer>
    );
  }

  return (
    <GalleryContainer>
      <GalleryHeader>
        <SectionTitle>Recent Images</SectionTitle>
        <HeaderActions>
          {canUpload && (
            <Link to={`/upload?character=${characterId}`}>
              <Button variant="primary" size="sm">
                Upload Image
              </Button>
            </Link>
          )}
          {totalCount > images.length && (
            <Link to={`/character/${characterId}/gallery`}>
              <Button variant="ghost" size="sm">
                View All ({totalCount})
              </Button>
            </Link>
          )}
        </HeaderActions>
      </GalleryHeader>

      <ImageGrid>
        {images.map((image) => {
          const isMainImage = mainImageId === image.id;
          
          return (
            <ImageCardWrapper key={image.id}>
              <Link to={`/image/${image.id}`}>
                {image.isNsfw && <NSFWBadge>NSFW</NSFWBadge>}
                {isMainImage && <MainImageBadge>Main Image</MainImageBadge>}
                <ImageElement
                  src={image.thumbnailUrl || image.url}
                  alt={image.altText || image.description || image.originalFilename}
                  loading="lazy"
                />
                <ImageOverlay>
                  {image.description || image.originalFilename}
                </ImageOverlay>
              </Link>
              
              {isOwner && (
                <ImageActions
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {isMainImage ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleClearMainImage()}
                      disabled={settingMainImage}
                    >
                      Remove as Main
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSetMainImage(image.id)}
                      disabled={settingMainImage}
                    >
                      Set as Main
                    </Button>
                  )}
                </ImageActions>
              )}
            </ImageCardWrapper>
          );
        })}
      </ImageGrid>

      {totalCount > images.length && (
        <ViewAllContainer>
          <Link to={`/character/${characterId}/gallery`}>
            <Button variant="primary" size="md">
              View All Images ({totalCount})
            </Button>
          </Link>
        </ViewAllContainer>
      )}
    </GalleryContainer>
  );
};
