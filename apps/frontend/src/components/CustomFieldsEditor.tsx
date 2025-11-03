import React from 'react';
import styled from 'styled-components';
import { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';

const FieldsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: start;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text.primary};
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }

  &::placeholder {
    color: ${props => props.theme.colors.text.muted};
  }
`;

const RemoveButton = styled.button`
  padding: 8px 12px;
  background: ${props => props.theme.colors.danger};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;

  &:hover {
    background: ${props => props.theme.colors.dangerHover || props.theme.colors.danger};
    opacity: 0.9;
  }
`;

const AddButton = styled.button`
  padding: 8px 16px;
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
  align-self: flex-start;

  &:hover {
    opacity: 0.9;
  }
`;

const EmptyState = styled.div`
  padding: 20px;
  text-align: center;
  color: ${props => props.theme.colors.text.muted};
  border: 1px dashed ${props => props.theme.colors.border};
  border-radius: 4px;
  font-size: 14px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  font-size: 14px;
  color: ${props => props.theme.colors.text.primary};
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: ${props => props.theme.colors.text.primary};
`;

interface CustomField {
  key: string;
  value: string;
}

interface CustomFieldsEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: UseFormWatch<any>;
  fieldName?: string;
}

export const CustomFieldsEditor: React.FC<CustomFieldsEditorProps> = ({
  register,
  setValue,
  watch,
  fieldName = 'customFields',
}) => {
  // Watch the customFields value
  const customFieldsValue = watch(fieldName);

  // Parse custom fields from JSON string or object
  const customFields: CustomField[] = React.useMemo(() => {
    if (!customFieldsValue) return [];

    try {
      const parsed = typeof customFieldsValue === 'string'
        ? JSON.parse(customFieldsValue)
        : customFieldsValue;

      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed).map(([key, value]) => ({
          key,
          value: String(value),
        }));
      }
      return [];
    } catch {
      return [];
    }
  }, [customFieldsValue]);

  const updateCustomFields = (newFields: CustomField[]) => {
    const fieldsObject = newFields.reduce((acc, field) => {
      if (field.key.trim()) {
        acc[field.key] = field.value;
      }
      return acc;
    }, {} as Record<string, string>);

    setValue(fieldName, JSON.stringify(fieldsObject), { shouldDirty: true });
  };

  const addField = () => {
    const newFields = [...customFields, { key: '', value: '' }];
    updateCustomFields(newFields);
  };

  const removeField = (index: number) => {
    const newFields = customFields.filter((_, i) => i !== index);
    updateCustomFields(newFields);
  };

  const updateField = (index: number, key: 'key' | 'value', newValue: string) => {
    const newFields = [...customFields];
    newFields[index][key] = newValue;
    updateCustomFields(newFields);
  };

  // Register the hidden input for form submission
  React.useEffect(() => {
    register(fieldName);
  }, [register, fieldName]);

  return (
    <div>
      <SectionTitle>Custom Fields</SectionTitle>

      <FieldsContainer>
        {customFields.length === 0 ? (
          <EmptyState>
            No custom fields yet. Click "Add Field" to create one.
          </EmptyState>
        ) : (
          <>
            <FieldRow>
              <Label>Field Name</Label>
              <Label>Value</Label>
              <div style={{ width: '70px' }} /> {/* Spacer for remove button column */}
            </FieldRow>

            {customFields.map((field, index) => (
              <FieldRow key={index}>
                <Input
                  type="text"
                  placeholder="e.g., Age, Pronouns, Occupation"
                  value={field.key}
                  onChange={(e) => updateField(index, 'key', e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="e.g., 25, they/them, Merchant"
                  value={field.value}
                  onChange={(e) => updateField(index, 'value', e.target.value)}
                />
                <RemoveButton
                  type="button"
                  onClick={() => removeField(index)}
                  aria-label="Remove field"
                >
                  Remove
                </RemoveButton>
              </FieldRow>
            ))}
          </>
        )}

        <AddButton type="button" onClick={addField}>
          + Add Field
        </AddButton>
      </FieldsContainer>
    </div>
  );
};
