import React from 'react';
import styled from 'styled-components';
import { Input } from '@chardb/ui';
import { TraitValueType } from '../../generated/graphql';

interface TraitDefaultValueInputProps {
  valueType: TraitValueType;
  defaultValueString?: string | null;
  defaultValueInt?: number | null;
  defaultValueTimestamp?: string | null;
  enumValues?: Array<{ id: string; name: string }>;
  onChange: (value: DefaultValueState) => void;
  disabled?: boolean;
}

export interface DefaultValueState {
  defaultValueString?: string | null;
  defaultValueInt?: number | null;
  defaultValueTimestamp?: string | null;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Select = styled.select`
  padding: 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const TraitDefaultValueInput: React.FC<TraitDefaultValueInputProps> = ({
  valueType,
  defaultValueString,
  defaultValueInt,
  defaultValueTimestamp,
  enumValues = [],
  onChange,
  disabled = false,
}) => {
  const handleStringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      defaultValueString: e.target.value || null,
      defaultValueInt: null,
      defaultValueTimestamp: null,
    });
  };

  const handleIntChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
    onChange({
      defaultValueString: null,
      defaultValueInt: value,
      defaultValueTimestamp: null,
    });
  };

  const handleTimestampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      defaultValueString: null,
      defaultValueInt: null,
      defaultValueTimestamp: e.target.value || null,
    });
  };

  const handleEnumChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value === '' ? null : e.target.value;
    onChange({
      defaultValueString: value,
      defaultValueInt: null,
      defaultValueTimestamp: null,
    });
  };

  switch (valueType) {
    case TraitValueType.String:
      return (
        <Container>
          <Label>Default Value</Label>
          <Input
            type="text"
            value={defaultValueString || ''}
            onChange={handleStringChange}
            placeholder="Enter default text value..."
            disabled={disabled}
          />
        </Container>
      );

    case TraitValueType.Integer:
      return (
        <Container>
          <Label>Default Value</Label>
          <Input
            type="number"
            value={defaultValueInt !== null && defaultValueInt !== undefined ? defaultValueInt : ''}
            onChange={handleIntChange}
            placeholder="Enter default number..."
            disabled={disabled}
          />
        </Container>
      );

    case TraitValueType.Timestamp:
      return (
        <Container>
          <Label>Default Value</Label>
          <Input
            type="date"
            value={defaultValueTimestamp ? defaultValueTimestamp.split('T')[0] : ''}
            onChange={handleTimestampChange}
            disabled={disabled}
          />
        </Container>
      );

    case TraitValueType.Enum:
      return (
        <Container>
          <Label>Default Value</Label>
          <Select
            value={defaultValueString || ''}
            onChange={handleEnumChange}
            disabled={disabled || enumValues.length === 0}
          >
            <option value="">None</option>
            {enumValues.map((enumValue) => (
              <option key={enumValue.id} value={enumValue.name}>
                {enumValue.name}
              </option>
            ))}
          </Select>
        </Container>
      );

    default:
      return null;
  }
};
