import React from "react";
import styled from "styled-components";
import { Type, Hash, Calendar, List, AlertCircle, Plus } from "lucide-react";
import { Input, ErrorMessage, Button } from "@chardb/ui";
import {
  TraitValueType,
  TraitDetailsFragment,
} from "../../generated/graphql";
import { useEnumValuesByTraitQuery, useEnumValueSettingsBySpeciesVariantQuery } from "../../generated/graphql";
import { TraitValueChip } from "./TraitValueChip";

/**
 * Dynamic Trait Value Editor Component for Character Creation/Editing
 *
 * Renders appropriate input components based on trait value types and integrates
 * with EnumValueSettings to show only allowed enum options for specific variants.
 * Provides comprehensive validation and user experience for trait value input.
 *
 * Supported Trait Types:
 * - STRING: Text input with validation
 * - INTEGER: Number input with constraints
 * - TIMESTAMP: Date/time picker
 * - ENUM: Dropdown with variant-filtered options
 *
 * Features:
 * - Type-specific input components with proper validation
 * - Integration with EnumValueSettings for variant-specific options
 * - Real-time validation feedback
 * - Accessible form controls with proper labeling
 * - Error handling and loading states
 * - Responsive design with consistent styling
 *
 * @example Usage in character forms:
 * ```tsx
 * <TraitValueEditor
 *   trait={scaleColorTrait}
 *   value={formData.traitValues.find(tv => tv.traitId === trait.id)?.value}
 *   onChange={(value) => updateTraitValue(trait.id, value)}
 *   speciesVariantId={selectedVariant?.id}
 *   error={errors[trait.id]}
 * />
 * ```
 */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
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

const RequiredIndicator = styled.span`
  color: ${({ theme }) => theme.colors.danger};
  font-size: 0.75rem;
`;

const TraitDescription = styled.p`
  margin: 0;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-style: italic;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
  font-family: inherit;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20;
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.surface}80;
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LoadingOption = styled.option`
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const EnumValueOption = styled.option`
  padding: 0.5rem;
`;

const ValidationHint = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: 0.25rem;
`;

const ErrorContainer = styled.div`
  margin-top: 0.25rem;
`;

const ValuesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const AddValueContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
`;

const InputWrapper = styled.div`
  flex: 1;
`;

const MultiValueIndicator = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 500;
  margin-left: auto;
`;

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
      return <AlertCircle size={14} />;
  }
};

// Helper function to get trait type description
const getTraitTypeDescription = (type: TraitValueType) => {
  switch (type) {
    case TraitValueType.String:
      return "Enter text (e.g., name, description, or any text value)";
    case TraitValueType.Integer:
      return "Enter a whole number (e.g., age, level, count)";
    case TraitValueType.Timestamp:
      return "Select a date and time";
    case TraitValueType.Enum:
      return "Choose from available options";
    default:
      return "";
  }
};

export interface TraitValueEntry {
  value: string;
  clarifier?: string | null;
}

interface TraitValueEditorProps {
  trait: TraitDetailsFragment;
  values: TraitValueEntry[];
  onChange: (values: TraitValueEntry[]) => void;
  speciesVariantId?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export const TraitValueEditor: React.FC<TraitValueEditorProps> = ({
  trait,
  values,
  onChange,
  speciesVariantId,
  error,
  required = false,
  disabled = false,
}) => {
  // Local state for current input value (used when adding new values for multi-value traits)
  const [currentValue, setCurrentValue] = React.useState("");
  const [currentClarifier, setCurrentClarifier] = React.useState("");

  // Fetch enum values for ENUM-type traits
  const {
    data: enumValuesData,
    loading: enumValuesLoading,
    error: enumValuesError,
  } = useEnumValuesByTraitQuery({
    variables: { traitId: trait.id, first: 100 },
    skip: trait.valueType !== TraitValueType.Enum,
  });

  // Fetch enum value settings for variant filtering
  const {
    data: enumSettingsData,
    loading: enumSettingsLoading,
  } = useEnumValueSettingsBySpeciesVariantQuery({
    variables: { speciesVariantId: speciesVariantId || "", first: 1000 },
    skip: !speciesVariantId || trait.valueType !== TraitValueType.Enum,
  });

  const trimmedClarifier = currentClarifier.trim();

  // Helper to add a new value to the values array
  const handleAddValue = () => {
    if (!currentValue.trim()) return;

    const newEntry: TraitValueEntry = {
      value: currentValue,
      ...(trait.allowsClarifier && trimmedClarifier
        ? { clarifier: trimmedClarifier }
        : {}),
    };

    // For single-value traits, replace the existing value
    if (!trait.allowsMultipleValues) {
      onChange([newEntry]);
      setCurrentValue("");
      setCurrentClarifier("");
      return;
    }

    // For multi-value traits, dedupe by (value, clarifier) pair
    const duplicate = values.some(
      (v) =>
        v.value === newEntry.value &&
        (v.clarifier ?? "") === (newEntry.clarifier ?? ""),
    );
    if (!duplicate) {
      onChange([...values, newEntry]);
    }
    setCurrentValue("");
    setCurrentClarifier("");
  };

  // Helper to remove a value from the values array by index
  const handleRemoveValueAt = (indexToRemove: number) => {
    onChange(values.filter((_, i) => i !== indexToRemove));
  };

  // For single-value traits, update value while preserving any clarifier
  const handleSingleValueChange = (newValue: string) => {
    if (!newValue) {
      onChange([]);
      return;
    }
    const existingClarifier = values[0]?.clarifier ?? null;
    onChange([
      {
        value: newValue,
        ...(trait.allowsClarifier && existingClarifier
          ? { clarifier: existingClarifier }
          : {}),
      },
    ]);
  };

  // For single-value traits, update clarifier while preserving the value
  const handleSingleClarifierChange = (newClarifier: string) => {
    const existingValue = values[0]?.value ?? "";
    if (!existingValue) return; // no value to attach a clarifier to
    const trimmed = newClarifier.trim();
    onChange([
      {
        value: existingValue,
        ...(trimmed ? { clarifier: trimmed } : {}),
      },
    ]);
  };

  // Filter enum values based on variant settings
  const availableEnumValues = React.useMemo(() => {
    if (trait.valueType !== TraitValueType.Enum) return [];

    const allEnumValues = enumValuesData?.enumValuesByTrait?.nodes || [];
    
    if (!speciesVariantId || !enumSettingsData) {
      // If no variant selected or settings not loaded, show all enum values
      return allEnumValues;
    }

    // Filter enum values based on settings (only show enabled ones)
    const enabledEnumValueIds = new Set(
      enumSettingsData.enumValueSettingsBySpeciesVariant?.nodes?.map(
        setting => setting.enumValueId
      ) || []
    );

    return allEnumValues.filter(enumValue => 
      enabledEnumValueIds.has(enumValue.id)
    );
  }, [trait.valueType, enumValuesData, enumSettingsData, speciesVariantId]);

  const renderClarifierInput = (
    value: string,
    onChangeFn: (v: string) => void,
    options: { multi?: boolean } = {},
  ) =>
    trait.allowsClarifier ? (
      <Input
        type="text"
        value={value}
        onChange={(e) => onChangeFn(e.target.value)}
        placeholder={
          options.multi
            ? "Clarifier (optional)..."
            : "Clarifier (optional)..."
        }
        maxLength={200}
        disabled={disabled}
        hasError={!!error}
      />
    ) : null;

  const renderInput = () => {
    // For multi-value traits, use Add button pattern
    const isMultiValue = trait.allowsMultipleValues;
    const singleValue = values.length > 0 ? values[0].value : "";
    const singleClarifier = values.length > 0 ? values[0].clarifier ?? "" : "";

    switch (trait.valueType) {
      case TraitValueType.String:
        if (isMultiValue) {
          return (
            <AddValueContainer>
              <InputWrapper>
                <Input
                  type="text"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddValue();
                    }
                  }}
                  placeholder={`Enter ${trait.name.toLowerCase()}...`}
                  disabled={disabled}
                  hasError={!!error}
                />
              </InputWrapper>
              {trait.allowsClarifier && (
                <InputWrapper>
                  {renderClarifierInput(currentClarifier, setCurrentClarifier, { multi: true })}
                </InputWrapper>
              )}
              <Button
                onClick={handleAddValue}
                disabled={disabled || !currentValue.trim()}
                variant="secondary"
              >
                <Plus size={16} />
                Add
              </Button>
            </AddValueContainer>
          );
        }
        return (
          <AddValueContainer>
            <InputWrapper>
              <Input
                type="text"
                value={singleValue}
                onChange={(e) => handleSingleValueChange(e.target.value)}
                placeholder={`Enter ${trait.name.toLowerCase()}...`}
                disabled={disabled}
                hasError={!!error}
              />
            </InputWrapper>
            {trait.allowsClarifier && (
              <InputWrapper>
                {renderClarifierInput(singleClarifier, handleSingleClarifierChange)}
              </InputWrapper>
            )}
          </AddValueContainer>
        );

      case TraitValueType.Integer:
        if (isMultiValue) {
          return (
            <AddValueContainer>
              <InputWrapper>
                <Input
                  type="number"
                  step="1"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddValue();
                    }
                  }}
                  placeholder={`Enter ${trait.name.toLowerCase()}...`}
                  disabled={disabled}
                  hasError={!!error}
                />
              </InputWrapper>
              {trait.allowsClarifier && (
                <InputWrapper>
                  {renderClarifierInput(currentClarifier, setCurrentClarifier, { multi: true })}
                </InputWrapper>
              )}
              <Button
                onClick={handleAddValue}
                disabled={disabled || !currentValue.trim()}
                variant="secondary"
              >
                <Plus size={16} />
                Add
              </Button>
            </AddValueContainer>
          );
        }
        return (
          <AddValueContainer>
            <InputWrapper>
              <Input
                type="number"
                step="1"
                value={singleValue}
                onChange={(e) => handleSingleValueChange(e.target.value)}
                placeholder={`Enter ${trait.name.toLowerCase()}...`}
                disabled={disabled}
                hasError={!!error}
              />
            </InputWrapper>
            {trait.allowsClarifier && (
              <InputWrapper>
                {renderClarifierInput(singleClarifier, handleSingleClarifierChange)}
              </InputWrapper>
            )}
          </AddValueContainer>
        );

      case TraitValueType.Timestamp:
        if (isMultiValue) {
          return (
            <AddValueContainer>
              <InputWrapper>
                <Input
                  type="datetime-local"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  disabled={disabled}
                  hasError={!!error}
                />
              </InputWrapper>
              {trait.allowsClarifier && (
                <InputWrapper>
                  {renderClarifierInput(currentClarifier, setCurrentClarifier, { multi: true })}
                </InputWrapper>
              )}
              <Button
                onClick={handleAddValue}
                disabled={disabled || !currentValue.trim()}
                variant="secondary"
              >
                <Plus size={16} />
                Add
              </Button>
            </AddValueContainer>
          );
        }
        return (
          <AddValueContainer>
            <InputWrapper>
              <Input
                type="datetime-local"
                value={singleValue}
                onChange={(e) => handleSingleValueChange(e.target.value)}
                disabled={disabled}
                hasError={!!error}
              />
            </InputWrapper>
            {trait.allowsClarifier && (
              <InputWrapper>
                {renderClarifierInput(singleClarifier, handleSingleClarifierChange)}
              </InputWrapper>
            )}
          </AddValueContainer>
        );

      case TraitValueType.Enum:
        if (enumValuesLoading || enumSettingsLoading) {
          return (
            <Select disabled>
              <LoadingOption>Loading options...</LoadingOption>
            </Select>
          );
        }

        if (enumValuesError) {
          return (
            <Select disabled>
              <LoadingOption>Error loading options</LoadingOption>
            </Select>
          );
        }

        if (availableEnumValues.length === 0) {
          return (
            <Select disabled>
              <LoadingOption>
                {speciesVariantId
                  ? "No options available for this variant"
                  : "No options configured"
                }
              </LoadingOption>
            </Select>
          );
        }

        if (isMultiValue) {
          // For multi-value enum traits without clarifiers, hide already-selected options.
          // With clarifiers we allow the same enum twice, since duplicates are distinguished
          // by their clarifier text (e.g. multiple "Common Body Mod" entries).
          const selectedIds = new Set(values.map((v) => v.value));
          return (
            <AddValueContainer>
              <InputWrapper>
                <Select
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  disabled={disabled}
                >
                  <option value="">
                    {required ? `Select ${trait.name.toLowerCase()}...` : `Optional - Select ${trait.name.toLowerCase()}...`}
                  </option>
                  {[...availableEnumValues]
                    .sort((a, b) => a.order - b.order)
                    .filter((enumValue) =>
                      trait.allowsClarifier ? true : !selectedIds.has(enumValue.id),
                    )
                    .map((enumValue) => (
                      <EnumValueOption key={enumValue.id} value={enumValue.id}>
                        {enumValue.name}
                      </EnumValueOption>
                    ))}
                </Select>
              </InputWrapper>
              {trait.allowsClarifier && (
                <InputWrapper>
                  {renderClarifierInput(currentClarifier, setCurrentClarifier, { multi: true })}
                </InputWrapper>
              )}
              <Button
                onClick={handleAddValue}
                disabled={disabled || !currentValue}
                variant="secondary"
              >
                <Plus size={16} />
                Add
              </Button>
            </AddValueContainer>
          );
        }

        return (
          <AddValueContainer>
            <InputWrapper>
              <Select
                value={singleValue}
                onChange={(e) => handleSingleValueChange(e.target.value)}
                disabled={disabled}
              >
                <option value="">
                  {required ? `Select ${trait.name.toLowerCase()}...` : `Optional - Select ${trait.name.toLowerCase()}...`}
                </option>
                {[...availableEnumValues]
                  .sort((a, b) => a.order - b.order)
                  .map((enumValue) => (
                    <EnumValueOption key={enumValue.id} value={enumValue.id}>
                      {enumValue.name}
                    </EnumValueOption>
                  ))}
              </Select>
            </InputWrapper>
            {trait.allowsClarifier && (
              <InputWrapper>
                {renderClarifierInput(singleClarifier, handleSingleClarifierChange)}
              </InputWrapper>
            )}
          </AddValueContainer>
        );

      default:
        return (
          <Input
            type="text"
            value={singleValue}
            onChange={(e) => handleSingleValueChange(e.target.value)}
            placeholder="Unknown trait type"
            disabled={true}
            hasError={!!error}
          />
        );
    }
  };

  // Get display names for enum values
  const getEnumValueName = (enumValueId: string): string => {
    if (trait.valueType !== TraitValueType.Enum) return enumValueId;
    const enumValue = availableEnumValues.find(ev => ev.id === enumValueId);
    return enumValue?.name || enumValueId;
  };

  // Get color hex code for enum values
  const getEnumValueColor = (enumValueId: string): string | null => {
    if (trait.valueType !== TraitValueType.Enum) return null;
    const enumValue = availableEnumValues.find(ev => ev.id === enumValueId);
    return enumValue?.color?.hexCode || null;
  };

  return (
    <Container>
      <Label htmlFor={`trait-${trait.id}`}>
        <TraitIcon>
          {getTraitTypeIcon(trait.valueType)}
        </TraitIcon>
        {trait.name}
        {required && <RequiredIndicator>*</RequiredIndicator>}
        {trait.allowsMultipleValues && (
          <MultiValueIndicator>Multi-value</MultiValueIndicator>
        )}
      </Label>

      <TraitDescription>
        {getTraitTypeDescription(trait.valueType)}
        {trait.valueType === TraitValueType.Enum && speciesVariantId && (
          <>
            {" • "}Available options are filtered based on the selected variant
          </>
        )}
      </TraitDescription>

      {/* Display existing values as chips for multi-value traits */}
      {trait.allowsMultipleValues && values.length > 0 && (
        <ValuesContainer>
          {values.map((entry, index) => (
            <TraitValueChip
              key={`${entry.value}-${entry.clarifier ?? ""}-${index}`}
              value={trait.valueType === TraitValueType.Enum ? getEnumValueName(entry.value) : entry.value}
              clarifier={entry.clarifier ?? null}
              onRemove={() => handleRemoveValueAt(index)}
              disabled={disabled}
              color={trait.valueType === TraitValueType.Enum ? getEnumValueColor(entry.value) : null}
            />
          ))}
        </ValuesContainer>
      )}

      {renderInput()}

      {trait.valueType === TraitValueType.Integer && (
        <ValidationHint>
          <Hash size={12} />
          Enter whole numbers only (no decimals)
        </ValidationHint>
      )}

      {trait.valueType === TraitValueType.Enum && availableEnumValues.length === 0 && speciesVariantId && (
        <ValidationHint>
          <AlertCircle size={12} />
          This trait has no available options for the selected variant
        </ValidationHint>
      )}

      {error && (
        <ErrorContainer>
          <ErrorMessage message={error} />
        </ErrorContainer>
      )}
    </Container>
  );
};