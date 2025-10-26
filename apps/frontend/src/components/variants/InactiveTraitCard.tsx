import React from 'react';
import styled from 'styled-components';
import { Plus } from 'lucide-react';
import { Button } from '@chardb/ui';
import { TraitValueType } from '../../generated/graphql';

interface InactiveTraitCardProps {
  trait: {
    id: string;
    name: string;
    valueType: TraitValueType;
  };
  onAdd: (traitId: string) => void;
  disabled?: boolean;
}

const Card = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary}40;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
`;

const TraitInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TraitName = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.25rem;
`;

const TraitMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TypeBadge = styled.span<{ $valueType: TraitValueType }>`
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ theme, $valueType }) => {
    switch ($valueType) {
      case TraitValueType.String:
        return `${theme.colors.primary}15`;
      case TraitValueType.Integer:
        return `${theme.colors.secondary}15`;
      case TraitValueType.Timestamp:
        return `${theme.colors.success}15`;
      case TraitValueType.Enum:
        return `${theme.colors.warning}15`;
      default:
        return `${theme.colors.text.muted}15`;
    }
  }};
  color: ${({ theme, $valueType }) => {
    switch ($valueType) {
      case TraitValueType.String:
        return theme.colors.primary;
      case TraitValueType.Integer:
        return theme.colors.secondary;
      case TraitValueType.Timestamp:
        return theme.colors.success;
      case TraitValueType.Enum:
        return theme.colors.warning;
      default:
        return theme.colors.text.muted;
    }
  }};
`;

export const InactiveTraitCard: React.FC<InactiveTraitCardProps> = ({
  trait,
  onAdd,
  disabled = false,
}) => {
  return (
    <Card>
      <TraitInfo>
        <TraitName>{trait.name}</TraitName>
        <TraitMeta>
          <TypeBadge $valueType={trait.valueType}>
            {trait.valueType}
          </TypeBadge>
        </TraitMeta>
      </TraitInfo>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => onAdd(trait.id)}
        disabled={disabled}
        icon={<Plus size={14} />}
      >
        Add to Variant
      </Button>
    </Card>
  );
};
