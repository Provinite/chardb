import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { GET_LIKED_MEDIA } from '../graphql/media';
import { LikeButton } from '../components/LikeButton';
import { LikeableType } from '../generated/graphql';

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

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const ImageCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
  transition: all 0.2s ease-in-out;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }
`;

const ImageContainer = styled.div`
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  cursor: pointer;
`;

const ImageElement = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease-in-out;

  &:hover {
    transform: scale(1.05);
  }
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

const CardContent = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
`;

const ImageTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ImageMeta = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
`;

const MetaBadge = styled.span`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const UploaderLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  
  &:hover {
    text-decoration: underline;
  }
`;

const CardActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const ViewButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  opacity: 0.5;
`;

const EmptyTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const EmptyDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
`;

const ExploreButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
  }
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

export const LikedMediaPage: React.FC = () => {
  const { user } = useAuth();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_LIKED_MEDIA, {
    skip: !user,
  });

  const likedMediaConnection = data?.likedMedia;
  const likedMedia = likedMediaConnection?.media || [];
  const total = likedMediaConnection?.total || 0;

  if (!user) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Please log in to view your liked media</h3>
        </ErrorContainer>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Error loading liked media</h3>
          <p>{error.message}</p>
        </ErrorContainer>
      </Container>
    );
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <>
      <Container>
        <Header>
          <Title>My Liked Media</Title>
          <Subtitle>
            Media you've shown love to
            {total > 0 && <span> • {total} items</span>}
          </Subtitle>
        </Header>

        {likedMedia.length === 0 ? (
          <EmptyState>
            <EmptyIcon>🖼️</EmptyIcon>
            <EmptyTitle>No liked media yet</EmptyTitle>
            <EmptyDescription>
              Start exploring and liking media you love! Your liked media will appear here.
            </EmptyDescription>
            <ExploreButton to="/media">
              Explore Media
            </ExploreButton>
          </EmptyState>
        ) : (
          <Grid>
            {likedMedia.map((media: any) => (
              <ImageCard key={media.id}>
                {media.image && (
                  <ImageContainer onClick={() => setLightboxImage(media.image.url)}>
                    <ImageElement
                      src={media.image.thumbnailUrl || media.image.url}
                      alt={media.image.altText || media.title}
                      loading="lazy"
                    />
                  </ImageContainer>
                )}
                {media.textContent && !media.image && (
                  <div style={{padding: '16px', backgroundColor: '#f5f5f5', minHeight: '200px', display: 'flex', flexDirection: 'column'}}>
                    <h4 style={{margin: '0 0 12px 0', color: '#333'}}>Text Content</h4>
                    <p style={{margin: 0, fontSize: '14px', lineHeight: '1.4', color: '#666'}}>
                      {media.textContent.content.slice(0, 200)}...
                    </p>
                  </div>
                )}
                
                <CardContent>
                  <ImageTitle>
                    {media.title || 'Untitled'}
                  </ImageTitle>
                  
                  <ImageMeta>
                    {media.image && <MetaBadge>{media.image.width} × {media.image.height}</MetaBadge>}
                    {media.image && <MetaBadge>{formatFileSize(media.image.fileSize)}</MetaBadge>}
                    {media.image?.isNsfw && <MetaBadge>NSFW</MetaBadge>}
                  </ImageMeta>

                  <ImageMeta>
                    <MetaBadge>
                      by <UploaderLink to={`/user/${media.owner.id}`}>
                        {media.owner.displayName || media.owner.username}
                      </UploaderLink>
                    </MetaBadge>
                    {media.character && (
                      <MetaBadge>
                        <UploaderLink to={`/character/${media.character.id}`}>
                          {media.character.name}
                        </UploaderLink>
                      </MetaBadge>
                    )}
                  </ImageMeta>
                  
                  <CardActions>
                    <ViewButton to={`/media/${media.id}`}>
                      View Media
                    </ViewButton>
                    <LikeButton
                      entityType={LikeableType.Media}
                      entityId={media.id}
                      size="small"
                    />
                  </CardActions>
                </CardContent>
              </ImageCard>
            ))}
          </Grid>
        )}
      </Container>

      <ImageOverlay isOpen={!!lightboxImage} onClick={() => setLightboxImage(null)}>
        {lightboxImage && (
          <img
            src={lightboxImage}
            alt="Full size image"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </ImageOverlay>
    </>
  );
};

export default LikedMediaPage;