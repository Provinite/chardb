import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { GET_MY_IMAGES } from '../graphql/images';

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
  gap: ${({ theme }) => theme.spacing.md};
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
  background: ${({ theme }) => theme.colors.background};
  cursor: pointer;
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const CardContent = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
`;

const ImageFilename = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ImageDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ImageMeta = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

const MetaBadge = styled.span<{ variant?: 'default' | 'success' | 'warning' | 'error' | 'primary' }>`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  background: ${props => {
    switch (props.variant) {
      case 'success': return props.theme.colors.success + '20';
      case 'warning': return props.theme.colors.warning + '20';
      case 'error': return props.theme.colors.error + '20';
      case 'primary': return props.theme.colors.primary + '20';
      default: return props.theme.colors.background;
    }
  }};
  color: ${props => {
    switch (props.variant) {
      case 'success': return props.theme.colors.success;
      case 'warning': return props.theme.colors.warning;
      case 'error': return props.theme.colors.error;
      case 'primary': return props.theme.colors.primary;
      default: return props.theme.colors.text.muted;
    }
  }};
`;

const CharacterLink = styled(Link)`
  background: ${({ theme }) => theme.colors.primary + '20'};
  color: ${({ theme }) => theme.colors.primary};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  text-decoration: none;
  transition: all 0.2s ease-in-out;

  &:hover {
    background: ${({ theme }) => theme.colors.primary + '30'};
  }
`;

const GalleryLink = styled(Link)`
  background: ${({ theme }) => theme.colors.secondary + '20'};
  color: ${({ theme }) => theme.colors.secondary};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  text-decoration: none;
  transition: all 0.2s ease-in-out;

  &:hover {
    background: ${({ theme }) => theme.colors.secondary + '30'};
  }
`;

const CardActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  flex-wrap: wrap;
`;

const ViewButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
  }
`;

const Lightbox = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isOpen'
})<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const LightboxImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
`;

const LightboxClose = styled.button`
  position: absolute;
  top: ${({ theme }) => theme.spacing.lg};
  right: ${({ theme }) => theme.spacing.lg};
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 2rem;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
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

const UploadButton = styled(Link)`
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

const getVisibilityVariant = (visibility: string) => {
  switch (visibility) {
    case 'PUBLIC': return 'success';
    case 'UNLISTED': return 'warning';
    case 'PRIVATE': return 'error';
    default: return 'default';
  }
};

// const formatDate = (dateString: string) => {
//   return new Date(dateString).toLocaleDateString('en-US', {
//     year: 'numeric',
//     month: 'short',
//     day: 'numeric'
//   });
// }; // Unused function

export const MyImagesPage: React.FC = () => {
  const { user } = useAuth();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_MY_IMAGES, {
    skip: !user,
  });

  const myImages = data?.myImages?.images || [];

  if (!user) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Please log in to view your images</h3>
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
          <h3>Error loading your images</h3>
          <p>{error.message}</p>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <>
      <Container>
        <Header>
          <Title>My Images</Title>
          <Subtitle>Images and artwork you've uploaded</Subtitle>
        </Header>

        {myImages.length === 0 ? (
          <EmptyState>
            <EmptyIcon>📸</EmptyIcon>
            <EmptyTitle>No images yet</EmptyTitle>
            <EmptyDescription>
              You haven't uploaded any images yet. Upload your first image to get started!
            </EmptyDescription>
            <UploadButton to="/upload">
              Upload Your First Image
            </UploadButton>
          </EmptyState>
        ) : (
          <Grid>
            {myImages.map((image: any) => (
              <ImageCard key={image.id}>
                <ImageContainer onClick={() => setLightboxImage(image.url)}>
                  {image.thumbnailUrl || image.url ? (
                    <Image
                      src={image.thumbnailUrl || image.url}
                      alt={image.altText || image.originalFilename}
                      loading="lazy"
                    />
                  ) : (
                    <ImagePlaceholder>
                      No preview available
                    </ImagePlaceholder>
                  )}
                </ImageContainer>
                
                <CardContent>
                  <ImageFilename>{image.originalFilename}</ImageFilename>
                  {image.description && (
                    <ImageDescription>{image.description}</ImageDescription>
                  )}
                  
                  <ImageMeta>
                    <MetaBadge variant={getVisibilityVariant(image.visibility)}>
                      {image.visibility}
                    </MetaBadge>
                    {image.isNsfw && (
                      <MetaBadge variant="warning">NSFW</MetaBadge>
                    )}
                    {image.character && (
                      <CharacterLink to={`/character/${image.character.id}`}>
                        {image.character.name}
                      </CharacterLink>
                    )}
                    {image.galleries && image.galleries.length > 0 && (
                      <GalleryLink to={`/gallery/${image.galleries[0].id}`}>
                        {image.galleries[0].name}
                      </GalleryLink>
                    )}
                  </ImageMeta>
                  
                  <CardActions>
                    <ViewButton to={`/image/${image.id}`}>
                      View Image
                    </ViewButton>
                  </CardActions>
                </CardContent>
              </ImageCard>
            ))}
          </Grid>
        )}
      </Container>

      <Lightbox isOpen={!!lightboxImage} onClick={() => setLightboxImage(null)}>
        <LightboxClose onClick={() => setLightboxImage(null)}>
          ×
        </LightboxClose>
        {lightboxImage && (
          <LightboxImage
            src={lightboxImage}
            alt="Image preview"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </Lightbox>
    </>
  );
};

export default MyImagesPage;