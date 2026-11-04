import React from "react";
import styled from "styled-components";
import { Input, Select } from "@chardb/ui";
import {
  TraitValueType,
  type TraitListEntryDetailsFragment,
} from "../../generated/graphql";
import { ColoredName } from "../colors";

interface TraitDefaultValueInputProps {
  valueType: TraitValueType;
  defaultValueString?: string | null;
  defaultValueInt?: number | null;
  defaultValueTimestamp?: string | null;
  enumValues?: NonNullable<TraitListEntryDetailsFragment["trait"]["enumValues"]>;
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

export const TraitDefaultValueInput: React.FC<TraitDefaultValueInputProps> = ({
  valueType,
  defaultValueString,
  defaultValueInt,
  defaultValueTimestamp,
  enumValues = [],
  onChange,
  disabled = false,
}) => {
  const labelId = React.useId();
  const handleStringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      defaultValueString: e.target.value || null,
      defaultValueInt: null,
      defaultValueTimestamp: null,
    });
  };

  const handleIntChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === "" ? null : parseInt(e.target.value, 10);
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

  const handleEnumChange = (picked: string) => {
    const value = picked === "" ? null : picked;
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
            value={defaultValueString || ""}
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
            value={
              defaultValueInt !== null && defaultValueInt !== undefined
                ? defaultValueInt
                : ""
            }
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
            value={
              defaultValueTimestamp ? defaultValueTimestamp.split("T")[0] : ""
            }
            onChange={handleTimestampChange}
            disabled={disabled}
          />
        </Container>
      );

    case TraitValueType.Enum:
      return (
        <Container>
          <Label id={labelId}>Default Value</Label>
          <Select.Root
            aria-labelledby={labelId}
            value={defaultValueString || ""}
            onChange={handleEnumChange}
            disabled={disabled || enumValues.length === 0}
          >
            <Select.Option value="">None</Select.Option>
            {enumValues.map((enumValue) => (
              <Select.Option
                key={enumValue.id}
                value={enumValue.name}
                textValue={enumValue.name}
              >
                <ColoredName
                  name={enumValue.name}
                  color={enumValue.color?.hexCode}
                />
              </Select.Option>
            ))}
          </Select.Root>
        </Container>
      );

    default:
      return null;
  }
};
