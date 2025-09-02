import React, { useMemo } from "react";
import styled from "styled-components";
import { Settings, AlertTriangle, CheckCircle } from "lucide-react";
import { ErrorMessage } from "@chardb/ui";
import {
  useTraitsBySpeciesQuery,
  CharacterTraitValueInput,
  SpeciesVariantDetailsFragment,
} from "../../generated/graphql";
import { TraitValueEditor } from "./TraitValueEditor";

/**
 * Comprehensive Trait Form Component for Character Creation/Editing
 *
 * Renders a complete form interface for all traits associated with a species.
 * Integrates with species variant selection to provide appropriate trait value
 * options and validation. Handles all trait value types and provides a
 * consistent user experience for trait configuration.
 *
 * Features:
 * - Automatic trait loading based on species selection
 * - Dynamic trait value editors for each trait type
 * - Integration with variant-specific enum value filtering
 * - Form validation and error handling
 * - Progress indicators and completion status
 * - Responsive layout with accessible design
 * - Real-time trait value updates
 *
 * @example Usage in character creation:
 * ```tsx
 * <TraitForm
 *   speciesId={selectedSpecies.id}
 *   speciesVariant={selectedVariant}
 *   traitValues={formData.traitValues}
 *   onChange={setTraitValues}
 *   errors={validationErrors}
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

const ProgressInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.primary}10;
  border: 1px solid ${({ theme }) => theme.colors.primary}30;
  border-radius: 6px;
  margin-bottom: 1rem;
`;

const ProgressText = styled.span`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.875rem;
  font-weight: 500;
`;

const TraitGrid = styled.div`
  display: grid;
  gap: 1.5rem;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
`;

const TraitCard = styled.div`
  padding: 1.5rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary}40;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
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
  padding: 3rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
`;

const VariantInfo = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.colors.secondary}10;
  border: 1px solid ${({ theme }) => theme.colors.secondary}30;
  border-radius: 6px;
  margin-bottom: 1rem;

  h4 {
    margin: 0 0 0.25rem 0;
    color: ${({ theme }) => theme.colors.secondary};
    font-size: 0.875rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: 0.875rem;
  }
`;

interface TraitFormProps {
  speciesId: string;
  speciesVariant?: SpeciesVariantDetailsFragment | null;
  traitValues: CharacterTraitValueInput[];
  onChange: (traitValues: CharacterTraitValueInput[]) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export const TraitForm: React.FC<TraitFormProps> = ({
  speciesId,
  speciesVariant,
  traitValues,
  onChange,
  errors = {},
  disabled = false,
}) => {
  // Fetch traits for the selected species
  const {
    data: traitsData,
    loading: traitsLoading,
    error: traitsError,
  } = useTraitsBySpeciesQuery({
    variables: { speciesId, first: 100 },
    skip: !speciesId,
  });

  const traits = traitsData?.traitsBySpecies?.nodes || [];

  // Calculate completion progress
  const { filledTraits, totalTraits } = useMemo(() => {
    const total = traits.length;
    const filled = traitValues.filter(tv => tv.value && tv.value.trim() !== "").length;
    return { filledTraits: filled, totalTraits: total };
  }, [traits, traitValues]);

  // Helper function to get trait value by trait ID
  const getTraitValue = (traitId: string): string => {
    return traitValues.find(tv => tv.traitId === traitId)?.value || "";
  };

  // Helper function to update trait value
  const updateTraitValue = (traitId: string, value: string) => {
    const updatedTraitValues = [...traitValues];
    const existingIndex = updatedTraitValues.findIndex(tv => tv.traitId === traitId);

    if (existingIndex >= 0) {
      // Update existing trait value
      updatedTraitValues[existingIndex] = { traitId, value };
    } else {
      // Add new trait value
      updatedTraitValues.push({ traitId, value });
    }

    // Remove empty trait values to keep the array clean
    const cleanedTraitValues = updatedTraitValues.filter(tv => 
      tv.value && tv.value.trim() !== ""
    );

    onChange(cleanedTraitValues);
  };

  // Loading state
  if (traitsLoading) {
    return (
      <Container>
        <SectionTitle>
          <Settings size={20} />
          Character Traits
        </SectionTitle>
        <LoadingState>Loading traits for this species...</LoadingState>
      </Container>
    );
  }

  // Error state
  if (traitsError) {
    return (
      <Container>
        <SectionTitle>
          <Settings size={20} />
          Character Traits
        </SectionTitle>
        <ErrorMessage message={`Failed to load traits: ${traitsError.message}`} />
      </Container>
    );
  }

  // Empty state
  if (traits.length === 0) {
    return (
      <Container>
        <SectionTitle>
          <Settings size={20} />
          Character Traits
        </SectionTitle>
        <EmptyState>
          <Settings size={48} />
          <h4>No traits configured</h4>
          <p>
            This species doesn't have any traits configured yet. 
            Characters can still be created without trait values.
          </p>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <SectionTitle>
        <Settings size={20} />
        Character Traits
      </SectionTitle>
      <SectionDescription>
        Configure the traits for your character. Each trait defines a specific characteristic
        or property that makes your character unique.
      </SectionDescription>

      {/* Variant Info */}
      {speciesVariant && (
        <VariantInfo>
          <h4>Variant: {speciesVariant.name}</h4>
          <p>
            Available trait options are filtered based on the selected variant.
            Different variants may have different available enum options.
          </p>
        </VariantInfo>
      )}

      {/* Progress Info */}
      <ProgressInfo>
        {filledTraits === totalTraits ? (
          <>
            <CheckCircle size={16} />
            <ProgressText>
              All traits completed ({filledTraits}/{totalTraits})
            </ProgressText>
          </>
        ) : (
          <>
            <AlertTriangle size={16} />
            <ProgressText>
              {filledTraits} of {totalTraits} traits filled
              {totalTraits > filledTraits && " • Complete remaining traits or leave them blank"}
            </ProgressText>
          </>
        )}
      </ProgressInfo>

      {/* Trait Editors Grid */}
      <TraitGrid>
        {traits.map((trait) => (
          <TraitCard key={trait.id}>
            <TraitValueEditor
              trait={trait}
              value={getTraitValue(trait.id)}
              onChange={(value) => updateTraitValue(trait.id, value)}
              speciesVariantId={speciesVariant?.id}
              error={errors[trait.id]}
              disabled={disabled}
            />
          </TraitCard>
        ))}
      </TraitGrid>
    </Container>
  );
};