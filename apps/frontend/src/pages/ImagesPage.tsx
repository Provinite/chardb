import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '@chardb/ui';
import { useGetMediaQuery, MediaType } from '../generated/graphql';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MediaGrid } from '../components/MediaGrid';

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

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;



export const ImagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data, loading, error } = useGetMediaQuery({
    variables: {
      filters: {
        limit: 50,
        offset: 0,
        search: searchTerm || undefined,
        mediaType: MediaType.Image, // Filter to only image media
      },
    },
  });

  const media = data?.media?.media || [];
  const totalCount = data?.media?.total || 0;

  // Filter media to only images (additional safety check)
  const imageMedia = media.filter(item => item.image);

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
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
          <h3>Error Loading Images</h3>
          <p>Unable to load images. Please try again later.</p>
        </div>
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
          <Button
            variant="primary"
            onClick={() => navigate('/upload')}
          >
            Upload Image
          </Button>
        </Controls>
      </Header>

      <MediaGrid
        media={imageMedia as any}
        showOwner={true}
        loading={loading}
        emptyMessage={searchTerm ? "No images match your search criteria" : "No images found"}
        emptyDescription={searchTerm ? "Try adjusting your search terms." : "Start building your collection by uploading your first image."}
      />
    </Container>
  );
};