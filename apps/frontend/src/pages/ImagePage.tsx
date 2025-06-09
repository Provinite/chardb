import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '@thclone/ui';
import { useGetImageQuery, LikeableType, CommentableType } from '../generated/graphql';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LikeButton } from '../components/LikeButton';
import { CommentList } from '../components/CommentList';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: ${({ theme }) => theme.spacing.xl};

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &::before {
    content: '←';
    font-weight: bold;
  }
`;

const ImageSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing.xl};

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const ImageContainer = styled.div`
  position: relative;
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const ImageElement = styled.img`
  width: 100%;
  height: auto;
  display: block;
  cursor: pointer;
`;

const ImageOverlay = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isOpen'
})<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: ${({ isOpen }) => (isOpen ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;

  img {
    max-width: 95vw;
    max-height: 95vh;
    object-fit: contain;
  }
`;

const MetadataPanel = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  height: fit-content;
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
`;

const MetadataSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  padding-bottom: ${({ theme }) => theme.spacing.xs};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
`;

const MetadataItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  gap: ${({ theme }) => theme.spacing.md};

  &:last-child {
    margin-bottom: 0;
  }
`;

const MetadataLabel = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  min-width: 80px;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const MetadataValue = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-align: right;
  word-break: break-word;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: 1.6;
  margin: 0;
`;

const UserLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};

  &:hover {
    text-decoration: underline;
  }
`;

const ArtistLink = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};

  &:hover {
    text-decoration: underline;
  }
`;

const Badge = styled.span<{ variant: 'nsfw' | 'private' | 'unlisted' }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  
  ${({ variant, theme }) => {
    switch (variant) {
      case 'nsfw':
        return `background: ${theme.colors.error}; color: white;`;
      case 'private':
        return `background: ${theme.colors.warning}; color: white;`;
      case 'unlisted':
        return `background: ${theme.colors.text.muted}; color: white;`;
      default:
        return '';
    }
  }}
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.lg};
  flex-wrap: wrap;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.error};

  h3 {
    font-size: ${({ theme }) => theme.typography.fontSize.xl};
    margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  }

  p {
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    margin: 0;
  }
`;

const CharacterLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};

  &:hover {
    text-decoration: underline;
  }
`;

const GalleryLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};

  &:hover {
    text-decoration: underline;
  }
`;

export const ImagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const { data, loading, error } = useGetImageQuery({
    variables: { id: id! },
    skip: !id,
  });

  const image = data?.image;

  const handleBack = () => {
    navigate('/images');
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (error || !image) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Image Not Found</h3>
          <p>The image you are looking for does not exist or you do not have permission to view it.</p>
        </ErrorContainer>
      </Container>
    );
  }

  const isOwner = user && image.uploader.id === user.id;

  return (
    <Container>
      <BackButton onClick={handleBack}>
        Back to Images
      </BackButton>

      <ImageSection>
        <ImageContainer>
          <ImageElement
            src={image.url}
            alt={image.altText || 'Image'}
            onClick={() => setLightboxOpen(true)}
          />
        </ImageContainer>

        <MetadataPanel>
          <Title>
            {image.description || image.originalFilename || 'Untitled'}
          </Title>

          <div style={{ marginBottom: '1rem' }}>
            <LikeButton 
              entityType={LikeableType.Image}
              entityId={image.id}
              size="medium"
            />
          </div>

          <MetadataSection>
            <SectionTitle>Basic Information</SectionTitle>
            
            <MetadataItem>
              <MetadataLabel>Uploader:</MetadataLabel>
              <MetadataValue>
                <UserLink to={`/user/${image.uploader.id}`}>
                  {image.uploader.username}
                </UserLink>
              </MetadataValue>
            </MetadataItem>

            {(image.artist || image.artistName) && (
              <MetadataItem>
                <MetadataLabel>Artist:</MetadataLabel>
                <MetadataValue>
                  {image.artist ? (
                    <UserLink to={`/user/${image.artist.id}`}>
                      {image.artist.username}
                    </UserLink>
                  ) : image.artistUrl ? (
                    <ArtistLink href={image.artistUrl} target="_blank" rel="noopener noreferrer">
                      {image.artistName}
                    </ArtistLink>
                  ) : (
                    image.artistName
                  )}
                </MetadataValue>
              </MetadataItem>
            )}

            {image.source && (
              <MetadataItem>
                <MetadataLabel>Source:</MetadataLabel>
                <MetadataValue>
                  {image.source.startsWith('http') ? (
                    <ArtistLink href={image.source} target="_blank" rel="noopener noreferrer">
                      External Link
                    </ArtistLink>
                  ) : (
                    image.source
                  )}
                </MetadataValue>
              </MetadataItem>
            )}

            <MetadataItem>
              <MetadataLabel>Uploaded:</MetadataLabel>
              <MetadataValue>
                {new Date(image.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </MetadataValue>
            </MetadataItem>

            <MetadataItem>
              <MetadataLabel>Status:</MetadataLabel>
              <MetadataValue>
                {image.isNsfw && <Badge variant="nsfw">NSFW</Badge>}
                {image.visibility === 'PRIVATE' && <Badge variant="private">Private</Badge>}
                {image.visibility === 'UNLISTED' && <Badge variant="unlisted">Unlisted</Badge>}
                {image.visibility === 'PUBLIC' && !image.isNsfw && 'Public'}
              </MetadataValue>
            </MetadataItem>
          </MetadataSection>

          <MetadataSection>
            <SectionTitle>File Details</SectionTitle>
            
            <MetadataItem>
              <MetadataLabel>Filename:</MetadataLabel>
              <MetadataValue>{image.originalFilename}</MetadataValue>
            </MetadataItem>

            <MetadataItem>
              <MetadataLabel>Dimensions:</MetadataLabel>
              <MetadataValue>{image.width} × {image.height}px</MetadataValue>
            </MetadataItem>

            <MetadataItem>
              <MetadataLabel>File Size:</MetadataLabel>
              <MetadataValue>{formatFileSize(image.fileSize)}</MetadataValue>
            </MetadataItem>

            <MetadataItem>
              <MetadataLabel>Type:</MetadataLabel>
              <MetadataValue>{image.mimeType}</MetadataValue>
            </MetadataItem>
          </MetadataSection>

          {(image.character || image.gallery) && (
            <MetadataSection>
              <SectionTitle>Associations</SectionTitle>
              
              {image.character && (
                <MetadataItem>
                  <MetadataLabel>Character:</MetadataLabel>
                  <MetadataValue>
                    <CharacterLink to={`/character/${image.character.id}`}>
                      {image.character.name}
                    </CharacterLink>
                  </MetadataValue>
                </MetadataItem>
              )}

              {image.gallery && (
                <MetadataItem>
                  <MetadataLabel>Gallery:</MetadataLabel>
                  <MetadataValue>
                    <GalleryLink to={`/gallery/${image.gallery.id}`}>
                      {image.gallery.name}
                    </GalleryLink>
                  </MetadataValue>
                </MetadataItem>
              )}
            </MetadataSection>
          )}

          {image.description && (
            <MetadataSection>
              <SectionTitle>Description</SectionTitle>
              <Description>{image.description}</Description>
            </MetadataSection>
          )}

          {isOwner && (
            <Actions>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/image/${image.id}/edit`)}
              >
                Edit Image
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // TODO: Implement delete functionality
                  console.log('Delete image:', image.id);
                }}
              >
                Delete
              </Button>
            </Actions>
          )}
        </MetadataPanel>
      </ImageSection>

      <CommentList
        entityType={CommentableType.Image}
        entityId={image.id}
      />

      <ImageOverlay isOpen={lightboxOpen} onClick={() => setLightboxOpen(false)}>
        <img
          src={image.url}
          alt={image.altText || 'Image'}
          onClick={(e) => e.stopPropagation()}
        />
      </ImageOverlay>
    </Container>
  );
};