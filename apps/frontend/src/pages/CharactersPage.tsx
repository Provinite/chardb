import React, { useState, useCallback } from "react";
import { useQuery } from "@apollo/client";
import styled from "styled-components";
import {
  GET_CHARACTERS,
  CharacterFiltersInput,
} from "../graphql/characters.graphql";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { CharacterGrid } from "../components/CharacterGrid";
import { RandomCharacterButton } from "../components/RandomCharacterButton";
import {
  AdvancedSearchForm,
  AdvancedSearchFilters,
} from "../components/AdvancedSearchForm";

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
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const BasicSearchRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ToggleSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
    align-items: stretch;
  }
`;

const ToggleButton = styled.button`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    color: white;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
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
  shouldForwardProp: (prop) => prop !== "active",
})<{ active: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 2px solid
    ${(props) =>
      props.active ? props.theme.colors.primary : props.theme.colors.border};
  background: ${(props) =>
    props.active ? props.theme.colors.primary : props.theme.colors.background};
  color: ${(props) =>
    props.active ? "white" : props.theme.colors.text.secondary};
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

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl}
    ${({ theme }) => theme.spacing.xl};
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
  const [filters, setFilters] = useState<CharacterFiltersInput>({
    limit: 12,
    offset: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<
    "ALL" | "PUBLIC" | "UNLISTED" | "PRIVATE"
  >("ALL");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [currentAdvancedFilters, setCurrentAdvancedFilters] =
    useState<AdvancedSearchFilters>({});

  const { data, loading, error, fetchMore } = useQuery(GET_CHARACTERS, {
    variables: { filters },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
    // Use a unique key for each filter combination to prevent cache conflicts
    context: {
      filterKey: JSON.stringify(filters),
    },
  });

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const newFilters = {
        limit: 12,
        offset: 0,
        search: searchTerm || undefined,
        species: speciesFilter || undefined,
        visibility:
          visibilityFilter === "ALL" ? undefined : (visibilityFilter as any),
      };
      setFilters(newFilters);
    },
    [searchTerm, speciesFilter, visibilityFilter],
  );

  // Handle visibility filter changes
  const handleVisibilityChange = useCallback(
    (visibility: "ALL" | "PUBLIC" | "UNLISTED" | "PRIVATE") => {
      setVisibilityFilter(visibility);
      const newFilters = {
        limit: 12,
        offset: 0,
        search: searchTerm || undefined,
        species: speciesFilter || undefined,
        visibility: visibility === "ALL" ? undefined : (visibility as any),
      };
      setFilters(newFilters);
    },
    [searchTerm, speciesFilter],
  );

  const handleAdvancedSearch = useCallback(
    (advancedFilters: AdvancedSearchFilters) => {
      setCurrentAdvancedFilters(advancedFilters);
      const newFilters: CharacterFiltersInput = {
        limit: 12,
        offset: 0,
        ...advancedFilters,
        // Convert string boolean values to actual booleans
        isSellable:
          typeof advancedFilters.isSellable === "string"
            ? advancedFilters.isSellable === "true"
              ? true
              : advancedFilters.isSellable === "false"
                ? false
                : undefined
            : advancedFilters.isSellable,
        isTradeable:
          typeof advancedFilters.isTradeable === "string"
            ? advancedFilters.isTradeable === "true"
              ? true
              : advancedFilters.isTradeable === "false"
                ? false
                : undefined
            : advancedFilters.isTradeable,
      };
      setFilters(newFilters);
    },
    [],
  );

  const handleClearAdvancedSearch = useCallback(() => {
    setCurrentAdvancedFilters({});
    setFilters({
      limit: 12,
      offset: 0,
    });
  }, []);

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
        <RandomCharacterButton
          characters={data?.characters?.characters || []}
        />
      </Header>

      <SearchSection>
        <ToggleSection>
          <ToggleButton
            type="button"
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
          >
            {showAdvancedSearch ? "← Simple Search" : "Advanced Search →"}
          </ToggleButton>

          {Object.keys(currentAdvancedFilters).length > 0 && (
            <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Advanced filters active
            </div>
          )}
        </ToggleSection>

        {showAdvancedSearch ? (
          <AdvancedSearchForm
            initialFilters={currentAdvancedFilters}
            onSearch={handleAdvancedSearch}
            onClear={handleClearAdvancedSearch}
            loading={loading}
          />
        ) : (
          <BasicSearchRow>
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
              <SearchButton type="submit">Search</SearchButton>
            </SearchForm>
          </BasicSearchRow>
        )}
      </SearchSection>

      <VisibilityFilter>
        <VisibilityLabel>Visibility:</VisibilityLabel>
        {(["ALL", "PUBLIC", "UNLISTED"] as const).map((visibility) => (
          <VisibilityButton
            key={visibility}
            active={visibilityFilter === visibility}
            onClick={() => handleVisibilityChange(visibility)}
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
              Showing {data.characters.characters.length} of{" "}
              {data.characters.total} characters
              {Object.keys(currentAdvancedFilters).length > 0 && " (filtered)"}
            </ResultsCount>
          )}

          {data?.characters.characters.length === 0 ? (
            <EmptyState>
              <h3>No characters found</h3>
              <p>
                Try adjusting your search terms or filters to find what you're
                looking for.
              </p>
            </EmptyState>
          ) : (
            <CharacterGrid
              characters={data?.characters.characters || []}
              showOwner={true}
              showEditButton={false}
            />
          )}

          {data?.characters.hasMore && (
            <LoadMoreButton onClick={handleLoadMore} disabled={loading}>
              {loading ? "Loading..." : "Load More Characters"}
            </LoadMoreButton>
          )}
        </>
      )}
    </Container>
  );
};
