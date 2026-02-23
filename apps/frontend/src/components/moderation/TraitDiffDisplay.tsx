import React, { useMemo } from 'react';
import styled from 'styled-components';
import { Type, Hash, Calendar, List } from 'lucide-react';
import { TraitValueType } from '../../generated/graphql';
import { ColorPip } from '../colors/ColorPip';

type TraitValue = {
  traitId: string;
  value: string | number | boolean | null;
  trait?: {
    name: string;
    valueType: TraitValueType;
    allowsMultipleValues: boolean;
  } | null;
  enumValue?: {
    name: string;
    color?: { id: string; hexCode: string } | null;
  } | null;
};

type DiffStatus = 'added' | 'removed' | 'changed' | 'unchanged';

interface GroupedTrait {
  traitId: string;
  traitName: string;
  valueType: TraitValueType;
  allowsMultipleValues: boolean;
  status: DiffStatus;
  previousValues: Array<{ value: string | number | boolean | null; enumValueName?: string | null; enumValueColor?: string | null }>;
  proposedValues: Array<{ value: string | number | boolean | null; enumValueName?: string | null; enumValueColor?: string | null }>;
}

interface TraitDiffDisplayProps {
  previousTraitValues: TraitValue[];
  proposedTraitValues: TraitValue[];
}

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

const TraitItem = styled.div<{ $status: DiffStatus }>`
  padding: 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 2px solid ${({ theme, $status }) => {
    switch ($status) {
      case 'added': return theme.colors.success;
      case 'removed': return theme.colors.error;
      case 'changed': return theme.colors.warning;
      default: return theme.colors.border;
    }
  }};
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

const StatusBadge = styled.span<{ $status: DiffStatus }>`
  margin-left: auto;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  background: ${({ theme, $status }) => {
    switch ($status) {
      case 'added': return theme.colors.success + '20';
      case 'removed': return theme.colors.error + '20';
      case 'changed': return theme.colors.warning + '20';
      default: return 'transparent';
    }
  }};
  color: ${({ theme, $status }) => {
    switch ($status) {
      case 'added': return theme.colors.success;
      case 'removed': return theme.colors.error;
      case 'changed': return theme.colors.warning;
      default: return theme.colors.text.muted;
    }
  }};
`;

const TraitValues = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const ValueChip = styled.span<{ $diff?: 'added' | 'removed' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  background: ${({ theme, $diff }) => {
    if ($diff === 'added') return theme.colors.success + '15';
    if ($diff === 'removed') return theme.colors.error + '15';
    return theme.colors.primary + '15';
  }};
  border: 1px solid ${({ theme, $diff }) => {
    if ($diff === 'added') return theme.colors.success + '30';
    if ($diff === 'removed') return theme.colors.error + '30';
    return theme.colors.primary + '30';
  }};
  border-radius: 16px;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 500;
  ${({ $diff }) => $diff === 'removed' && 'text-decoration: line-through; opacity: 0.7;'}
`;

const ColorPipWrapper = styled.span`
  margin-right: 0.75rem;
  display: inline-block;
  vertical-align: middle;
`;

const TraitValue = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
`;

const getTraitTypeIcon = (type: TraitValueType) => {
  switch (type) {
    case TraitValueType.String: return <Type size={14} />;
    case TraitValueType.Integer: return <Hash size={14} />;
    case TraitValueType.Timestamp: return <Calendar size={14} />;
    case TraitValueType.Enum: return <List size={14} />;
    default: return null;
  }
};

function groupTraitValues(traitValues: TraitValue[]) {
  const grouped = new Map<string, {
    traitName: string;
    valueType: TraitValueType;
    allowsMultipleValues: boolean;
    values: Array<{ value: string | number | boolean | null; enumValueName?: string | null; enumValueColor?: string | null }>;
  }>();

  for (const tv of traitValues) {
    if (!tv.trait) continue;
    if (!grouped.has(tv.traitId)) {
      grouped.set(tv.traitId, {
        traitName: tv.trait.name,
        valueType: tv.trait.valueType,
        allowsMultipleValues: tv.trait.allowsMultipleValues,
        values: [],
      });
    }
    grouped.get(tv.traitId)!.values.push({
      value: tv.value,
      enumValueName: tv.enumValue?.name,
      enumValueColor: tv.enumValue?.color?.hexCode,
    });
  }

  return grouped;
}

export const TraitDiffDisplay: React.FC<TraitDiffDisplayProps> = ({
  previousTraitValues,
  proposedTraitValues,
}) => {
  const diffedTraits = useMemo(() => {
    const prevGrouped = groupTraitValues(previousTraitValues);
    const propGrouped = groupTraitValues(proposedTraitValues);

    const allTraitIds = new Set([...prevGrouped.keys(), ...propGrouped.keys()]);
    const result: GroupedTrait[] = [];

    for (const traitId of allTraitIds) {
      const prev = prevGrouped.get(traitId);
      const prop = propGrouped.get(traitId);

      if (!prev && prop) {
        result.push({
          traitId,
          traitName: prop.traitName,
          valueType: prop.valueType,
          allowsMultipleValues: prop.allowsMultipleValues,
          status: 'added',
          previousValues: [],
          proposedValues: prop.values,
        });
      } else if (prev && !prop) {
        result.push({
          traitId,
          traitName: prev.traitName,
          valueType: prev.valueType,
          allowsMultipleValues: prev.allowsMultipleValues,
          status: 'removed',
          previousValues: prev.values,
          proposedValues: [],
        });
      } else if (prev && prop) {
        const prevValueSet = new Set(prev.values.map((v) => String(v.value)));
        const propValueSet = new Set(prop.values.map((v) => String(v.value)));
        const isChanged = prevValueSet.size !== propValueSet.size ||
          [...prevValueSet].some((v) => !propValueSet.has(v));

        result.push({
          traitId,
          traitName: prop.traitName,
          valueType: prop.valueType,
          allowsMultipleValues: prop.allowsMultipleValues,
          status: isChanged ? 'changed' : 'unchanged',
          previousValues: prev.values,
          proposedValues: prop.values,
        });
      }
    }

    return result;
  }, [previousTraitValues, proposedTraitValues]);

  return (
    <Container>
      <TraitGrid>
        {diffedTraits.map((trait) => (
          <TraitItem key={trait.traitId} $status={trait.status}>
            <TraitHeader>
              <TraitIcon>
                {getTraitTypeIcon(trait.valueType)}
              </TraitIcon>
              <TraitName>{trait.traitName}</TraitName>
              {trait.status !== 'unchanged' && (
                <StatusBadge $status={trait.status}>{trait.status}</StatusBadge>
              )}
            </TraitHeader>

            <TraitValues>
              {trait.status === 'changed' && trait.allowsMultipleValues ? (
                // For multi-value changed traits, show individual value diffs
                <>
                  {trait.previousValues
                    .filter((pv) => !trait.proposedValues.some((v) => String(v.value) === String(pv.value)))
                    .map((v, i) => (
                      <ValueChip key={`removed-${i}`} $diff="removed">
                        {v.enumValueColor && (
                          <ColorPipWrapper><ColorPip color={v.enumValueColor} size="sm" /></ColorPipWrapper>
                        )}
                        {v.enumValueName || String(v.value)}
                      </ValueChip>
                    ))}
                  {trait.proposedValues.map((v, i) => {
                    const isNew = !trait.previousValues.some((pv) => String(pv.value) === String(v.value));
                    return (
                      <ValueChip key={`prop-${i}`} $diff={isNew ? 'added' : undefined}>
                        {v.enumValueColor && (
                          <ColorPipWrapper><ColorPip color={v.enumValueColor} size="sm" /></ColorPipWrapper>
                        )}
                        {v.enumValueName || String(v.value)}
                      </ValueChip>
                    );
                  })}
                </>
              ) : (
                // For single-value or non-changed traits, show the proposed (or previous for removed)
                (trait.status === 'removed' ? trait.previousValues : trait.proposedValues).map((v, i) => (
                  <ValueChip key={i}>
                    {v.enumValueColor && (
                      <ColorPipWrapper><ColorPip color={v.enumValueColor} size="sm" /></ColorPipWrapper>
                    )}
                    {v.enumValueName || String(v.value)}
                  </ValueChip>
                ))
              )}
            </TraitValues>
          </TraitItem>
        ))}
      </TraitGrid>
    </Container>
  );
};
