import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '@thclone/ui';
import { useGetImagesQuery, Visibility } from '../generated/graphql';
import { LoadingSpinner } from '../components/LoadingSpinner';

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
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Stats = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
`;

const Controls = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: center;
  flex-wrap: wrap;
`;

const SearchBar = styled.input`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  min-width: 250px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const FilterSelect = styled.select`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const ImageCard = styled(Link)`
  display: block;
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  text-decoration: none;
  color: inherit;
  border: 1px solid ${({ theme }) => theme.colors.border};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const ImageContainer = styled.div`
  position: relative;
  width: 100%;
  padding-bottom: 75%; /* 4:3 aspect ratio */
  overflow: hidden;
`;

const ImageElement = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;

  ${ImageCard}:hover & {
    transform: scale(1.05);
  }
`;

const ImageInfo = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
`;

const ImageTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ImageMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ImageDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: ${({ theme }) => theme.spacing.xs} 0 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.text.secondary};

  h3 {
    font-size: ${({ theme }) => theme.typography.fontSize.xl};
    margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  p {
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
  }
`;

const ErrorState = styled.div`
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

const NSFWBadge = styled.span`
  position: absolute;
  top: ${({ theme }) => theme.spacing.sm};
  right: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.error};
  color: white;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
`;

const ArtistInfo = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: ${({ theme }) => theme.spacing.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ImagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<Visibility | ''>('');

  const { data, loading, error } = useGetImagesQuery({
    variables: {
      filters: {
        limit: 50,
        offset: 0,
        visibility: visibilityFilter || undefined,
        search: searchTerm || undefined,
      },
    },
  });

  const images = data?.images?.images || [];
  const totalCount = data?.images?.total || 0;

  const filteredImages = searchTerm
    ? images.filter(image =>
        image.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        image.altText?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : images;

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
        <ErrorState>
          <h3>Error Loading Images</h3>
          <p>Unable to load images. Please try again later.</p>
        </ErrorState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <div>
          <Title>Image Library</Title>
          <Stats>{totalCount} images</Stats>
        </div>
        <Controls>
          <SearchBar
            type="text"
            placeholder="Search images..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FilterSelect
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as Visibility | '')}
          >
            <option value="">All Visibility</option>
            <option value="PUBLIC">Public</option>
            <option value="UNLISTED">Unlisted</option>
            <option value="PRIVATE">Private</option>
          </FilterSelect>
          <Button
            variant="primary"
            onClick={() => navigate('/upload')}
          >
            Upload Image
          </Button>
        </Controls>
      </Header>

      {filteredImages.length === 0 ? (
        <EmptyState>
          <h3>No Images Found</h3>
          <p>
            {searchTerm
              ? 'No images match your search criteria.'
              : 'Start building your collection by uploading your first image.'}
          </p>
          <Button
            variant="primary"
            onClick={() => navigate('/upload')}
          >
            Upload Your First Image
          </Button>
        </EmptyState>
      ) : (
        <ImageGrid>
          {filteredImages.map((image) => (
            <ImageCard key={image.id} to={`/image/${image.id}`}>
              <ImageContainer>
                <ImageElement
                  src={image.thumbnailUrl || image.url}
                  alt={image.altText || 'Image'}
                />
                {image.isNsfw && <NSFWBadge>NSFW</NSFWBadge>}
              </ImageContainer>
              <ImageInfo>
                <ImageTitle>
                  {image.description || image.originalFilename || 'Untitled'}
                </ImageTitle>
                <ImageMeta>
                  <span>By {image.uploader.username}</span>
                  <span>{new Date(image.createdAt).toLocaleDateString()}</span>
                </ImageMeta>
                {(image.artistName || image.artist) && (
                  <ArtistInfo>
                    Artist: {image.artistName || image.artist?.username}
                  </ArtistInfo>
                )}
                {image.description && (
                  <ImageDescription>{image.description}</ImageDescription>
                )}
              </ImageInfo>
            </ImageCard>
          ))}
        </ImageGrid>
      )}
    </Container>
  );
};