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

const FilterTabs = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const FilterTab = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid
    ${(props) =>
      props.active ? props.theme.colors.primary : props.theme.colors.border};
  background: ${(props) =>
    props.active ? props.theme.colors.primary : props.theme.colors.background};
  color: ${(props) =>
    props.active ? 'white' : props.theme.colors.text.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  cursor: pointer;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: all 0.2s;

  &:hover:not([data-active='true']) {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primary}10;
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

type MediaFilter = 'all' | 'images' | 'text';

export const MediaLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');

  const { data, loading, error } = useGetMediaQuery({
    variables: {
      filters: {
        limit: 50,
        offset: 0,
        search: searchTerm || undefined,
        mediaType:
          mediaFilter === 'all'
            ? undefined
            : mediaFilter === 'images'
              ? MediaType.Image
              : MediaType.Text,
      },
    },
  });

  const media = data?.media?.media || [];
  const totalCount = data?.media?.total || 0;

  // Count media by type for filter tabs
  const imageCount = media.filter((item) => item.image).length;
  const textCount = media.filter((item) => item.textContent).length;

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
          <h3>Error Loading Media</h3>
          <p>Unable to load media. Please try again later.</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <div>
          <Title>Media Library</Title>
          <Stats>{totalCount} media items</Stats>
        </div>
        <Controls>
          <SearchBar
            type="text"
            placeholder="Search media..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button variant="primary" onClick={() => navigate('/upload')}>
            Add Media
          </Button>
        </Controls>
      </Header>

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        media={media as any}
        showOwner={true}
        loading={loading}
        emptyMessage={
          searchTerm
            ? 'No media matches your search criteria'
            : mediaFilter === 'all'
              ? 'No media found'
              : `No ${mediaFilter} found`
        }
        emptyDescription={
          searchTerm
            ? 'Try adjusting your search terms.'
            : 'Start building your collection by uploading your first media.'
        }
      />
    </Container>
  );
};
