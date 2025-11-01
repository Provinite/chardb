import React from 'react';
import styled from 'styled-components';

/**
 * RadioGroup - A group of radio buttons with consistent styling and theme integration
 *
 * Provides a set of mutually exclusive options where only one can be selected at a time.
 * Built with accessibility in mind and integrates seamlessly with the application theme.
 *
 * Features:
 * - Controlled component with value and onChange props
 * - Accessible keyboard navigation
 * - Theme-based styling with focus states
 * - Support for disabled state
 * - Custom styling for selected state
 *
 * @example
 * ```tsx
 * // Basic radio group
 * const [visibility, setVisibility] = useState('PUBLIC');
 *
 * <RadioGroup value={visibility} onChange={setVisibility}>
 *   <Radio value="PUBLIC">Public</Radio>
 *   <Radio value="UNLISTED">Unlisted</Radio>
 *   <Radio value="PRIVATE">Private</Radio>
 * </RadioGroup>
 *
 * // With label and description
 * <div>
 *   <label>Character Ownership</label>
 *   <RadioGroup value={ownerType} onChange={setOwnerType}>
 *     <Radio value="normal">Owned by me</Radio>
 *     <Radio value="orphaned">Orphaned (no owner)</Radio>
 *   </RadioGroup>
 * </div>
 *
 * // With disabled options
 * <RadioGroup value={selected} onChange={setSelected}>
 *   <Radio value="option1">Available Option</Radio>
 *   <Radio value="option2" disabled>Disabled Option</Radio>
 * </RadioGroup>
 * ```
 */

interface RadioGroupContextValue {
  value: string;
  onChange: (value: string) => void;
  name: string;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

interface RadioGroupProps {
  /** Current selected value */
  value: string;
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** Optional name for the radio group */
  name?: string;
  /** Radio button children */
  children: React.ReactNode;
  /** Additional className for styling */
  className?: string;
}

const StyledRadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

/**
 * RadioGroup container component
 */
export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onChange,
  name = 'radio-group',
  children,
  className,
}) => {
  return (
    <RadioGroupContext.Provider value={{ value, onChange, name }}>
      <StyledRadioGroup className={className} role="radiogroup">
        {children}
      </StyledRadioGroup>
    </RadioGroupContext.Provider>
  );
};

interface RadioProps {
  /** Value of this radio option */
  value: string;
  /** Label text or content */
  children: React.ReactNode;
  /** Whether this radio is disabled */
  disabled?: boolean;
}

const RadioContainer = styled.label<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
  padding: ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  transition: background-color 0.2s;

  &:hover:not([aria-disabled="true"]) {
    background-color: ${({ theme }) => theme.colors.surface};
  }
`;

const HiddenRadio = styled.input.attrs({ type: 'radio' })`
  position: absolute;
  opacity: 0;
  pointer-events: none;
`;

const StyledRadio = styled.div<{ $checked: boolean; $disabled?: boolean }>`
  width: 20px;
  height: 20px;
  border: 2px solid ${({ theme, $checked, $disabled }) => {
    if ($disabled) return theme.colors.text.muted;
    return $checked ? theme.colors.primary : theme.colors.border;
  }};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;

  ${HiddenRadio}:focus + & {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary + '20'};
  }

  &::after {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: ${({ theme }) => theme.borderRadius.full};
    background-color: ${({ theme, $checked, $disabled }) => {
      if (!$checked) return 'transparent';
      if ($disabled) return theme.colors.text.muted;
      return theme.colors.primary;
    }};
    transform: scale(${({ $checked }) => ($checked ? 1 : 0)});
    transition: transform 0.15s ease-in-out;
  }
`;

const RadioLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text.primary};
  user-select: none;
`;

/**
 * Individual Radio button component (must be used within RadioGroup)
 */
export const Radio: React.FC<RadioProps> = ({ value, children, disabled = false }) => {
  const context = React.useContext(RadioGroupContext);

  if (!context) {
    throw new Error('Radio must be used within a RadioGroup');
  }

  const { value: groupValue, onChange, name } = context;
  const checked = groupValue === value;

  const handleChange = () => {
    if (!disabled) {
      onChange(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleChange();
    }
  };

  return (
    <RadioContainer
      $disabled={disabled}
      aria-disabled={disabled}
      onClick={handleChange}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
    >
      <HiddenRadio
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        tabIndex={-1}
      />
      <StyledRadio $checked={checked} $disabled={disabled} />
      <RadioLabel>{children}</RadioLabel>
    </RadioContainer>
  );
};
