import React, { useState, useMemo } from "react";
import styled from "styled-components";
import { Search, Database, Palette } from "lucide-react";
import { Input, ErrorMessage } from "@chardb/ui";
import {
  useSpeciesQuery,
  useSpeciesVariantsBySpeciesQuery,
  SpeciesDetailsFragment,
  SpeciesVariantDetailsFragment,
} from "../../generated/graphql";

/**
 * Species and Variant Selection Component for Character Creation
 *
 * Provides a two-step selection process for choosing character species and variant.
 * Integrates with the species management system and shows available variants
 * based on the selected species.
 *
 * Features:
 * - Species search and selection with visual cards
 * - Automatic variant loading based on species selection
 * - Variant selection with metadata display
 * - Real-time validation and error handling
 * - Integration with character creation forms
 * - Responsive design with accessible interactions
 *
 * @example Usage in character creation:
 * ```tsx
 * <SpeciesSelector
 *   selectedSpecies={formData.species}
 *   selectedVariant={formData.variant}
 *   onSpeciesChange={(species) => setFormData(prev => ({...prev, species}))}
 *   onVariantChange={(variant) => setFormData(prev => ({...prev, variant}))}
 *   error={errors.species}
 * />
 * ```
 */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SectionDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
  margin: 0 0 1rem 0;
`;

const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 1rem;
`;

const SearchInput = styled(Input)`
  padding-left: 2.5rem;
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.muted};
  width: 1rem;
  height: 1rem;
`;

const SelectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.5rem;
`;

const SelectionCard = styled.div<{ isSelected: boolean; isDisabled?: boolean }>`
  padding: 1rem;
  border: 2px solid
    ${({ theme, isSelected, isDisabled }) =>
      isDisabled
        ? theme.colors.border
        : isSelected
          ? theme.colors.primary
          : theme.colors.border};
  border-radius: 8px;
  background: ${({ theme, isDisabled }) =>
    isDisabled ? `${theme.colors.surface}80` : theme.colors.surface};
  cursor: ${({ isDisabled }) => (isDisabled ? "not-allowed" : "pointer")};
  transition: all 0.2s ease;
  opacity: ${({ isDisabled }) => (isDisabled ? 0.6 : 1)};

  &:hover {
    ${({ isDisabled, theme }) =>
      !isDisabled &&
      `
      border-color: ${theme.colors.primary};
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    `}
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
`;

const CardIcon = styled.div<{ variant?: "species" | "variant" }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  background: ${({ theme, variant }) =>
    variant === "variant" ? theme.colors.secondary : theme.colors.primary}20;
  color: ${({ theme, variant }) =>
    variant === "variant" ? theme.colors.secondary : theme.colors.primary};
`;

const CardTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  line-height: 1.2;
`;

const CardMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const MetaBadge = styled.span`
  background: ${({ theme }) => theme.colors.primary}10;
  color: ${({ theme }) => theme.colors.primary};
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};

  h4 {
    margin: 0.5rem 0 0.25rem 0;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  p {
    margin: 0;
    font-size: 0.875rem;
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
`;

const SelectedInfo = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.colors.primary}10;
  border: 1px solid ${({ theme }) => theme.colors.primary}30;
  border-radius: 8px;
  margin-top: 1rem;

  h4 {
    margin: 0 0 0.5rem 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.875rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 500;
  }
`;

interface SpeciesSelectorProps {
  selectedSpecies?: SpeciesDetailsFragment | null;
  selectedVariant?: SpeciesVariantDetailsFragment | null;
  onSpeciesChange: (species: SpeciesDetailsFragment | null) => void;
  onVariantChange: (variant: SpeciesVariantDetailsFragment | null) => void;
  error?: string;
  userCommunityMemberships?: Array<{
    role: {
      communityId: string;
      canCreateCharacter?: boolean;
    };
  }>;
  disabled?: boolean;
}

export const SpeciesSelector: React.FC<SpeciesSelectorProps> = ({
  selectedSpecies,
  selectedVariant,
  onSpeciesChange,
  onVariantChange,
  error,
  userCommunityMemberships = [],
  disabled = false,
}) => {
  const [speciesSearchQuery, setSpeciesSearchQuery] = useState("");

  // Fetch species (optionally filtered by community)
  const {
    data: speciesData,
    loading: speciesLoading,
    error: speciesError,
  } = useSpeciesQuery({
    variables: { first: 100 },
  });

  // Fetch variants for selected species
  const {
    data: variantsData,
    loading: variantsLoading,
    error: variantsError,
  } = useSpeciesVariantsBySpeciesQuery({
    variables: {
      speciesId: selectedSpecies?.id || "",
      first: 50,
    },
    skip: !selectedSpecies?.id,
  });

  // Filter species based on search query
  const filteredSpecies = useMemo(() => {
    const species = speciesData?.species?.nodes || [];
    if (!speciesSearchQuery.trim()) return species;

    return species.filter((s) =>
      s.name.toLowerCase().includes(speciesSearchQuery.toLowerCase()),
    );
  }, [speciesData, speciesSearchQuery]);

  const variants = variantsData?.speciesVariantsBySpecies?.nodes || [];

  // Check if user has permission to create characters for a species
  const canCreateCharacterForSpecies = (
    species: SpeciesDetailsFragment,
  ): boolean => {
    return userCommunityMemberships.some(
      (membership) =>
        membership.role.communityId === species.communityId &&
        membership.role.canCreateCharacter === true,
    );
  };

  // Handlers
  const handleSpeciesSelect = (species: SpeciesDetailsFragment) => {
    // Don't allow selection if user doesn't have permission
    if (!canCreateCharacterForSpecies(species)) {
      return;
    }
    if (selectedSpecies?.id === species.id) {
      // Deselect if clicking the same species
      onSpeciesChange(null);
      onVariantChange(null);
    } else {
      onSpeciesChange(species);
      onVariantChange(null); // Clear variant when species changes
    }
  };

  const handleVariantSelect = (variant: SpeciesVariantDetailsFragment) => {
    if (selectedVariant?.id === variant.id) {
      onVariantChange(null);
    } else {
      onVariantChange(variant);
    }
  };

  return (
    <Container>
      {/* Species Selection */}
      <div>
        <SectionTitle>
          <Database size={20} />
          Choose Species
        </SectionTitle>
        <SectionDescription>
          Select the species for your character. Each species has unique traits
          and variants available.
        </SectionDescription>

        {error && <ErrorMessage message={error} />}

        <SearchContainer>
          <SearchIcon />
          <SearchInput
            placeholder="Search species..."
            value={speciesSearchQuery}
            onChange={(e) => setSpeciesSearchQuery(e.target.value)}
            disabled={disabled}
          />
        </SearchContainer>

        {speciesLoading ? (
          <LoadingState>Loading available species...</LoadingState>
        ) : speciesError ? (
          <ErrorMessage
            message={`Failed to load species: ${speciesError.message}`}
          />
        ) : filteredSpecies.length === 0 ? (
          <EmptyState>
            <Database size={48} />
            <h4>No species found</h4>
            <p>
              {speciesSearchQuery
                ? `No species match "${speciesSearchQuery}"`
                : "No species are available for character creation"}
            </p>
          </EmptyState>
        ) : (
          <SelectionGrid>
            {filteredSpecies.map((species) => {
              const hasPermission = canCreateCharacterForSpecies(species);
              const isCardDisabled = disabled || !hasPermission;
              return (
                <SelectionCard
                  key={species.id}
                  isSelected={selectedSpecies?.id === species.id}
                  isDisabled={isCardDisabled}
                  onClick={() => !disabled && handleSpeciesSelect(species)}
                  title={
                    !hasPermission
                      ? "You don't have permission to create characters for this species"
                      : undefined
                  }
                >
                  <CardHeader>
                    <CardIcon>
                      <Database size={16} />
                    </CardIcon>
                    <CardTitle>{species.name}</CardTitle>
                  </CardHeader>
                  <CardMeta>
                    <MetaBadge>Community Species</MetaBadge>
                    {species.hasImage && <MetaBadge>Has Image</MetaBadge>}
                    {!hasPermission && (
                      <MetaBadge
                        style={{ background: "#ff000020", color: "#ff0000" }}
                      >
                        No Permission
                      </MetaBadge>
                    )}
                  </CardMeta>
                </SelectionCard>
              );
            })}
          </SelectionGrid>
        )}

        {selectedSpecies && (
          <SelectedInfo>
            <h4>Selected Species</h4>
            <p>{selectedSpecies.name}</p>
          </SelectedInfo>
        )}
      </div>

      {/* Variant Selection */}
      {selectedSpecies && (
        <div>
          <SectionTitle>
            <Palette size={20} />
            Choose Variant
          </SectionTitle>
          <SectionDescription>
            Select a variant of {selectedSpecies.name}. Different variants may
            have different available trait options.
          </SectionDescription>

          {variantsLoading ? (
            <LoadingState>
              Loading variants for {selectedSpecies.name}...
            </LoadingState>
          ) : variantsError ? (
            <ErrorMessage
              message={`Failed to load variants: ${variantsError.message}`}
            />
          ) : variants.length === 0 ? (
            <EmptyState>
              <Palette size={48} />
              <h4>No variants available</h4>
              <p>This species doesn't have any variants configured yet.</p>
            </EmptyState>
          ) : (
            <SelectionGrid>
              {variants.map((variant) => (
                <SelectionCard
                  key={variant.id}
                  isSelected={selectedVariant?.id === variant.id}
                  isDisabled={disabled}
                  onClick={() => !disabled && handleVariantSelect(variant)}
                >
                  <CardHeader>
                    <CardIcon variant="variant">
                      <Palette size={16} />
                    </CardIcon>
                    <CardTitle>{variant.name}</CardTitle>
                  </CardHeader>
                  <CardMeta>
                    <MetaBadge>Variant</MetaBadge>
                  </CardMeta>
                </SelectionCard>
              ))}
            </SelectionGrid>
          )}

          {selectedVariant && (
            <SelectedInfo>
              <h4>Selected Variant</h4>
              <p>{selectedVariant.name}</p>
            </SelectedInfo>
          )}
        </div>
      )}
    </Container>
  );
};
