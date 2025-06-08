import React, { useState, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { GET_CHARACTERS, Character, CharacterFiltersInput } from '../graphql/characters';
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
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
    align-items: stretch;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const SearchSection = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.75rem ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const FilterSelect = styled.select`
  padding: 0.75rem ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  background: ${({ theme }) => theme.colors.background};
  min-width: 150px;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const VisibilityFilter = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const VisibilityButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 2px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.border};
  background: ${props => props.active ? props.theme.colors.primary : props.theme.colors.background};
  color: ${props => props.active ? 'white' : props.theme.colors.text.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const CharacterCard = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  transition: all 0.2s;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
  
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const CharacterName = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
`;

const CharacterSpecies = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const CharacterDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.5;
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CharacterMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const OwnerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ImageCount = styled.span`
  background: ${({ theme }) => theme.colors.surface};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const VisibilityBadge = styled.span<{ visibility: string }>`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  background: ${props => 
    props.visibility === 'PUBLIC' ? props.theme.colors.success + '20' :
    props.visibility === 'UNLISTED' ? props.theme.colors.warning + '20' : props.theme.colors.error + '20'
  };
  color: ${props => 
    props.visibility === 'PUBLIC' ? props.theme.colors.success :
    props.visibility === 'UNLISTED' ? props.theme.colors.warning : props.theme.colors.error
  };
`;

const LoadMoreButton = styled.button`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.secondary};
  }
  
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
  
  &:disabled {
    background: ${({ theme }) => theme.colors.text.muted};
    cursor: not-allowed;
  }
`;

const ResultsCount = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const SearchForm = styled.form`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  flex: 1;
`;

const SearchButton = styled.button`
  padding: 0.75rem ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  
  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
  }
  
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const VisibilityLabel = styled.span`
  margin-right: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.error};
  
  h3 {
    margin-bottom: ${({ theme }) => theme.spacing.sm};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xxl};
`;

const MetaContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: center;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.text.muted};
  
  h3 {
    font-size: ${({ theme }) => theme.typography.fontSize.xxl};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  
  p {
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    line-height: 1.5;
  }
`;

export const CharactersPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<CharacterFiltersInput>({
    limit: 12,
    offset: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'ALL' | 'PUBLIC' | 'UNLISTED' | 'PRIVATE'>('ALL');

  const { data, loading, error, fetchMore } = useQuery(GET_CHARACTERS, {
    variables: { filters },
    notifyOnNetworkStatusChange: true,
  });

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({
      ...prev,
      offset: 0,
      search: searchTerm || undefined,
      species: speciesFilter || undefined,
      visibility: visibilityFilter === 'ALL' ? undefined : visibilityFilter as any,
    }));
  }, [searchTerm, speciesFilter, visibilityFilter]);

  const handleLoadMore = useCallback(() => {
    if (data?.characters.hasMore) {
      fetchMore({
        variables: {
          filters: {
            ...filters,
            offset: data.characters.characters.length,
          },
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            characters: {
              ...fetchMoreResult.characters,
              characters: [
                ...prev.characters.characters,
                ...fetchMoreResult.characters.characters,
              ],
            },
          };
        },
      });
    }
  }, [data, filters, fetchMore]);

  const handleCharacterClick = useCallback((characterId: string) => {
    navigate(`/character/${characterId}`);
  }, [navigate]);
  
  const handleCharacterKeyDown = useCallback((e: React.KeyboardEvent, characterId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCharacterClick(characterId);
    }
  }, [handleCharacterClick]);

  if (error) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Error loading characters</h3>
          <p>{error.message}</p>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Browse Characters</Title>
      </Header>

      <SearchSection>
        <SearchForm onSubmit={handleSearch}>
          <SearchInput
            type="text"
            placeholder="Search characters by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FilterSelect
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
          >
            <option value="">All Species</option>
            <option value="Dragon">Dragon</option>
            <option value="Wolf">Wolf</option>
            <option value="Cat">Cat</option>
            <option value="Fox">Fox</option>
            <option value="Human">Human</option>
            <option value="Other">Other</option>
          </FilterSelect>
          <SearchButton type="submit">
            Search
          </SearchButton>
        </SearchForm>
      </SearchSection>

      <VisibilityFilter>
        <VisibilityLabel>Visibility:</VisibilityLabel>
        {(['ALL', 'PUBLIC', 'UNLISTED'] as const).map((visibility) => (
          <VisibilityButton
            key={visibility}
            active={visibilityFilter === visibility}
            onClick={() => setVisibilityFilter(visibility)}
            aria-label={`Filter by ${visibility.toLowerCase()} characters`}
          >
            {visibility}
          </VisibilityButton>
        ))}
      </VisibilityFilter>

      {loading && !data ? (
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      ) : (
        <>
          {data?.characters && (
            <ResultsCount>
              Showing {data.characters.characters.length} of {data.characters.total} characters
            </ResultsCount>
          )}

          {data?.characters.characters.length === 0 ? (
            <EmptyState>
              <h3>No characters found</h3>
              <p>Try adjusting your search terms or filters to find what you're looking for.</p>
            </EmptyState>
          ) : (
            <CharacterGrid>
              {data?.characters.characters.map((character: Character) => (
                <CharacterCard
                  key={character.id}
                  onClick={() => handleCharacterClick(character.id)}
                  onKeyDown={(e) => handleCharacterKeyDown(e, character.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View character ${character.name}`}
                >
                  <CharacterName>{character.name}</CharacterName>
                  {character.species && (
                    <CharacterSpecies>{character.species}</CharacterSpecies>
                  )}
                  {character.description && (
                    <CharacterDescription>{character.description}</CharacterDescription>
                  )}
                  
                  <CharacterMeta>
                    <OwnerInfo>
                      by {character.owner.displayName || character.owner.username}
                    </OwnerInfo>
                    <MetaContainer>
                      {character._count && (
                        <ImageCount>{character._count.images} images</ImageCount>
                      )}
                      <VisibilityBadge visibility={character.visibility}>
                        {character.visibility}
                      </VisibilityBadge>
                    </MetaContainer>
                  </CharacterMeta>
                </CharacterCard>
              ))}
            </CharacterGrid>
          )}

          {data?.characters.hasMore && (
            <LoadMoreButton onClick={handleLoadMore} disabled={loading}>
              {loading ? 'Loading...' : 'Load More Characters'}
            </LoadMoreButton>
          )}
        </>
      )}
    </Container>
  );
};