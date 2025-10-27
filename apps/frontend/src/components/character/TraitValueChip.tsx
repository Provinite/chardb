import React from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';

/**
 * Trait Value Chip Component
 *
 * Displays an individual trait value as a removable chip/badge.
 * Used in multi-value trait editing to show and manage multiple values.
 *
 * Features:
 * - Clean, compact chip design
 * - Remove button with hover effects
 * - Optional disabled state
 * - Theme-integrated styling
 *
 * @example
 * ```tsx
 * <TraitValueChip
 *   value="Red"
 *   onRemove={() => removeValue(index)}
 *   disabled={isSubmitting}
 * />
 * ```
 */

const Chip = styled.div<{ $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: ${({ theme }) => theme.colors.primary}15;
  border: 1px solid ${({ theme }) => theme.colors.primary}30;
  border-radius: 16px;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};
  transition: all 0.2s ease;
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'default')};

  &:hover {
    background: ${({ theme, $disabled }) =>
      $disabled ? theme.colors.primary + '15' : theme.colors.primary + '20'};
    border-color: ${({ theme, $disabled }) =>
      $disabled ? theme.colors.primary + '30' : theme.colors.primary + '50'};
  }
`;

const ValueText = styled.span`
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RemoveButton = styled.button<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: color 0.2s ease;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.danger};
  }

  &:disabled {
    opacity: 0.5;
  }
`;

interface TraitValueChipProps {
  /** The trait value to display */
  value: string;
  /** Callback when the remove button is clicked */
  onRemove: () => void;
  /** Whether the chip is disabled (prevents removal) */
  disabled?: boolean;
}

export const TraitValueChip: React.FC<TraitValueChipProps> = ({
  value,
  onRemove,
  disabled = false,
}) => {
  return (
    <Chip $disabled={disabled}>
      <ValueText title={value}>{value}</ValueText>
      <RemoveButton
        onClick={onRemove}
        disabled={disabled}
        $disabled={disabled}
        type="button"
        title="Remove value"
        aria-label={`Remove ${value}`}
      >
        <X size={14} />
      </RemoveButton>
    </Chip>
  );
};
