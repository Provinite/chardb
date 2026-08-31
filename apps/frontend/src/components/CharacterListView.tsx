import React, { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import styled from "styled-components";
import {
  useGetCharactersQuery,
  CharacterAvailability,
  CharacterFiltersInput,
} from "../generated/graphql";
import { LoadingSpinner } from "./LoadingSpinner";
import { CharacterGrid } from "./CharacterGrid";
import { RandomCharacterButton } from "./RandomCharacterButton";
import {
  AdvancedSearchForm,
  AdvancedSearchFilters,
} from "./AdvancedSearchForm";
import { Pager } from "./pagination/Pager";
import { useOffsetPaging } from "../hooks/useOffsetPaging";

const AVAILABILITY_VALUES = new Set<string>(
  Object.values(CharacterAvailability),
);

/**
 * Read `availability=FREEBIE,OFFERS` off the URL, dropping anything unknown.
 *
 * URLs are typed by hand and outlive deployments, so a value the enum has
 * since lost has to be ignored rather than sent on to be rejected -- a stale
 * bookmark should lose one checkbox, not the whole page.
 */
function parseAvailabilityParam(raw: string | null): CharacterAvailability[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value) =>
      AVAILABILITY_VALUES.has(value),
    ) as CharacterAvailability[];
}

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

const BreadcrumbContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

export interface CharacterListViewProps {
  /** Fixed filters that cannot be changed by the user (e.g., communityId) */
  baseFilters?: Partial<CharacterFiltersInput>;
  /** Default filter values to start with */
  defaultFilters?: Partial<CharacterFiltersInput>;
  /** Page title */
  title?: string;
  /** Optional breadcrumb content */
  breadcrumb?: React.ReactNode;
}

export const CharacterListView: React.FC<CharacterListViewProps> = ({
  baseFilters = {},
  defaultFilters = {},
  title = "Browse Characters",
  breadcrumb,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL params or defaults
  const getInitialFilters = useCallback((): CharacterFiltersInput => {
    const params: CharacterFiltersInput = {
      limit: 12,
      offset: 0,
      ...baseFilters,
      ...defaultFilters,
    };

    // Parse URL parameters
    const search = searchParams.get("search");
    const isSellable = searchParams.get("isSellable");
    const isTradeable = searchParams.get("isTradeable");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");
    const searchFields = searchParams.get("searchFields");

    if (search) params.search = search;
    if (minPrice) params.minPrice = parseFloat(minPrice);
    if (maxPrice) params.maxPrice = parseFloat(maxPrice);
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;
    if (searchFields) params.searchFields = searchFields;

    // `availability=FREEBIE,OFFERS` is the shape the checkbox row writes.
    const availability = parseAvailabilityParam(
      searchParams.get("availability"),
    );

    // The two booleans this replaced. Links and bookmarks carrying them still
    // exist, and a shared search that silently stopped filtering would be
    // worse than one that errored -- so `?isTradeable=true` is read as a tick
    // in the matching box. `=false` has no equivalent and stays a boolean,
    // which is the one thing the checkbox row cannot ask.
    const legacy: CharacterAvailability[] = [];
    if (isSellable === "true") legacy.push(CharacterAvailability.ForSale);
    if (isTradeable === "true")
      legacy.push(CharacterAvailability.TradeCharacters);
    if (isSellable === "false") params.isSellable = false;
    if (isTradeable === "false") params.isTradeable = false;

    const kinds = [...new Set([...availability, ...legacy])];
    if (kinds.length) params.availability = kinds;

    return params;
  }, [searchParams, baseFilters, defaultFilters]);

  const [filters, setFilters] =
    useState<CharacterFiltersInput>(getInitialFilters);
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  // Seeded from the URL, so opening advanced search on a shared link shows the
  // boxes that link actually ticked rather than an empty form beside a
  // filtered list.
  const [currentAdvancedFilters, setCurrentAdvancedFilters] =
    useState<AdvancedSearchFilters>(() => {
      const availability = getInitialFilters().availability;
      return availability?.length ? { availability } : {};
    });

  // Update URL when filters change
  const updateURL = useCallback(
    (newFilters: CharacterFiltersInput) => {
      const params = new URLSearchParams();

      if (newFilters.search) params.set("search", newFilters.search);
      if (newFilters.availability?.length)
        params.set("availability", newFilters.availability.join(","));
      if (newFilters.isSellable !== undefined)
        params.set("isSellable", String(newFilters.isSellable));
      if (newFilters.isTradeable !== undefined)
        params.set("isTradeable", String(newFilters.isTradeable));
      if (newFilters.minPrice !== undefined)
        params.set("minPrice", String(newFilters.minPrice));
      if (newFilters.maxPrice !== undefined)
        params.set("maxPrice", String(newFilters.maxPrice));
      if (newFilters.sortBy) params.set("sortBy", newFilters.sortBy);
      if (newFilters.sortOrder) params.set("sortOrder", newFilters.sortOrder);
      if (newFilters.searchFields)
        params.set("searchFields", newFilters.searchFields);

      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  const { data, loading, error, fetchMore } = useGetCharactersQuery({
    variables: { filters },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
    context: {
      filterKey: JSON.stringify(filters),
    },
  });

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const newFilters = {
        ...baseFilters,
        limit: 12,
        offset: 0,
        search: searchTerm || undefined,
      };
      setFilters(newFilters);
      updateURL(newFilters);
    },
    [searchTerm, baseFilters, updateURL],
  );

  const handleAdvancedSearch = useCallback(
    (advancedFilters: AdvancedSearchFilters) => {
      setCurrentAdvancedFilters(advancedFilters);
      const newFilters: CharacterFiltersInput = {
        ...baseFilters,
        limit: 12,
        offset: 0,
        // The string coercion that used to live here is gone with the two
        // dropdowns that produced it. Checkboxes give the enum directly.
        ...advancedFilters,
      };
      setFilters(newFilters);
      updateURL(newFilters);
    },
    [baseFilters, updateURL],
  );

  const handleClearAdvancedSearch = useCallback(() => {
    setCurrentAdvancedFilters({});
    const newFilters = {
      ...baseFilters,
      limit: 12,
      offset: 0,
    };
    setFilters(newFilters);
    updateURL(newFilters);
  }, [baseFilters, updateURL]);

  const { loadMore, loadingMore } = useOffsetPaging({
    pageSize: filters.limit ?? 12,
    loaded: data?.characters.characters.length ?? 0,
    hasMore: data?.characters.hasMore ?? false,
    load: ({ limit, offset }) =>
      fetchMore({
        variables: { filters: { ...filters, limit, offset } },
        // Append rather than replace. Apollo replaces the cached result by
        // default, so without this Load More removes what it was adding to.
        updateQuery: (prev, { fetchMoreResult }) =>
          fetchMoreResult
            ? {
                characters: {
                  ...fetchMoreResult.characters,
                  characters: [
                    ...prev.characters.characters,
                    ...fetchMoreResult.characters.characters,
                  ],
                },
              }
            : prev,
      }),
  });

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
      {breadcrumb && <BreadcrumbContainer>{breadcrumb}</BreadcrumbContainer>}

      <Header>
        <Title>{title}</Title>
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
              <SearchButton type="submit">Search</SearchButton>
            </SearchForm>
          </BasicSearchRow>
        )}
      </SearchSection>

      {loading && !data ? (
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      ) : (
        <>
          {data?.characters.characters.length === 0 ? (
            <EmptyState>
              <h3>No characters found</h3>
              <p>
                Try adjusting your search terms or filters to find what you're
                looking for.
              </p>
            </EmptyState>
          ) : (
            <Pager
              showing={data?.characters.characters.length ?? 0}
              total={data?.characters.total ?? 0}
              hasMore={data?.characters.hasMore ?? false}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
              noun="characters"
              qualifier={
                Object.keys(currentAdvancedFilters).length > 0
                  ? " (filtered)"
                  : undefined
              }
            >
              <CharacterGrid
                characters={data?.characters.characters || []}
                showOwner={true}
                showEditButton={false}
              />
            </Pager>
          )}
        </>
      )}
    </Container>
  );
};
