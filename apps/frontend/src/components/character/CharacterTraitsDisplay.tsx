import React, { useMemo } from 'react';
import styled from 'styled-components';
import { Type, Hash, Calendar, List } from 'lucide-react';
import { GetCharacterQuery, TraitValueType } from '../../generated/graphql';
import { ColorPip } from '../colors/ColorPip';

/**
 * Character Traits Display Component
 *
 * Displays all trait values for a character in a clean, organized format.
 * Groups multi-value traits and shows them as chips for consistency with
 * the editing interface.
 *
 * Features:
 * - Groups trait values by trait
 * - Displays trait names with type icons
 * - Shows multiple values as chips for multi-value traits
 * - Resolves enum value names for readable display
 * - Empty state when no traits configured
 */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const TraitGrid = styled.div`
  display: grid;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
`;

const TraitItem = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
`;

const TraitHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const TraitIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
`;

const TraitName = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
`;

const MultiValueIndicator = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 500;
  margin-left: auto;
`;

const TraitValues = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const TraitValue = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
`;

const ValueChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  background: ${({ theme }) => theme.colors.primary}15;
  border: 1px solid ${({ theme }) => theme.colors.primary}30;
  border-radius: 16px;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 500;
`;

const ColorPipWrapper = styled.span`
  margin-right: 0.75rem;
  display: inline-block;
  vertical-align: middle;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem 1rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-style: italic;
`;

type CharacterTraitValue = NonNullable<GetCharacterQuery['character']>['traitValues'][0];

interface CharacterTraitsDisplayProps {
  traitValues: CharacterTraitValue[];
}

// Helper function to get trait type icon
const getTraitTypeIcon = (type: TraitValueType) => {
  switch (type) {
    case TraitValueType.String:
      return <Type size={14} />;
    case TraitValueType.Integer:
      return <Hash size={14} />;
    case TraitValueType.Timestamp:
      return <Calendar size={14} />;
    case TraitValueType.Enum:
      return <List size={14} />;
    default:
      return null;
  }
};

export const CharacterTraitsDisplay: React.FC<CharacterTraitsDisplayProps> = ({
  traitValues,
}) => {
  // Group trait values by traitId
  const groupedTraits = useMemo(() => {
    const grouped = new Map<string, {
      trait: NonNullable<CharacterTraitValue['trait']>;
      values: Array<{
        value: string | number | boolean | null;
        enumValueName?: string | null;
        enumValueColor?: string | null;
      }>;
    }>();

    for (const tv of traitValues) {
      // Skip if trait definition is missing (deleted trait)
      if (!tv.trait) continue;

      if (!grouped.has(tv.traitId)) {
        grouped.set(tv.traitId, {
          trait: tv.trait,
          values: [],
        });
      }

      const entry = grouped.get(tv.traitId)!;
      entry.values.push({
        value: tv.value,
        enumValueName: tv.enumValue?.name,
        enumValueColor: tv.enumValue?.color?.hexCode,
      });
    }

    return Array.from(grouped.values());
  }, [traitValues]);

  if (groupedTraits.length === 0) {
    return (
      <EmptyState>
        No trait values configured for this character.
      </EmptyState>
    );
  }

  return (
    <Container>
      <TraitGrid>
        {groupedTraits.map(({ trait, values }) => {
          const isMultiValue = trait.allowsMultipleValues && values.length > 1;

          return (
            <TraitItem key={trait.name}>
              <TraitHeader>
                <TraitIcon>
                  {getTraitTypeIcon(trait.valueType)}
                </TraitIcon>
                <TraitName>{trait.name}</TraitName>
                {isMultiValue && (
                  <MultiValueIndicator>×{values.length}</MultiValueIndicator>
                )}
              </TraitHeader>

              <TraitValues>
                {isMultiValue ? (
                  // Display as chips for multi-value traits
                  values.map((v, index) => {
                    const displayValue = v.enumValueName || String(v.value);
                    return (
                      <ValueChip key={`${v.value}-${index}`}>
                        {v.enumValueColor && (
                          <ColorPipWrapper>
                            <ColorPip color={v.enumValueColor} size="sm" />
                          </ColorPipWrapper>
                        )}
                        {displayValue}
                      </ValueChip>
                    );
                  })
                ) : (
                  // Display as plain text for single-value traits
                  <TraitValue>
                    {values[0]?.enumValueColor && (
                      <ColorPipWrapper>
                        <ColorPip color={values[0].enumValueColor} size="sm" />
                      </ColorPipWrapper>
                    )}
                    {values[0]?.enumValueName || String(values[0]?.value)}
                  </TraitValue>
                )}
              </TraitValues>
            </TraitItem>
          );
        })}
      </TraitGrid>
    </Container>
  );
};
