import React from 'react';
import styled from 'styled-components';
import { useQuery } from '@apollo/client';
import { GET_COMMUNITY_COLORS } from '../../graphql/community-colors.graphql';
import { GetCommunityColorsQuery } from '../../generated/graphql';
import { ColorPip } from './ColorPip';
import { LoadingSpinner } from '../LoadingSpinner';

const SelectContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Select = styled.select`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Option = styled.option`
  padding: ${({ theme }) => theme.spacing.sm};
`;

const PreviewContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.surface};
`;

const PreviewText = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ErrorText = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.error};
`;

export interface ColorSelectorProps {
  communityId: string;
  value?: string | null;
  onChange: (colorId: string | null) => void;
  label?: string;
  placeholder?: string;
  allowNone?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * A dropdown selector for choosing colors from a community's color palette.
 * Displays a preview of the selected color with the color pip.
 */
export const ColorSelector: React.FC<ColorSelectorProps> = ({
  communityId,
  value,
  onChange,
  label = 'Color',
  placeholder = 'Select a color',
  allowNone = true,
  disabled = false,
  className,
}) => {
  const { data, loading, error } = useQuery<GetCommunityColorsQuery>(
    GET_COMMUNITY_COLORS,
    {
      variables: { communityId },
      skip: !communityId,
    }
  );

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value;
    onChange(newValue === '' ? null : newValue);
  };

  const selectedColor = data?.communityColors?.find(color => color.id === value);

  if (loading) {
    return (
      <SelectContainer className={className}>
        {label && <Label>{label}</Label>}
        <LoadingSpinner />
      </SelectContainer>
    );
  }

  if (error) {
    return (
      <SelectContainer className={className}>
        {label && <Label>{label}</Label>}
        <ErrorText>Error loading colors: {error.message}</ErrorText>
      </SelectContainer>
    );
  }

  const colors = data?.communityColors || [];

  return (
    <SelectContainer className={className}>
      {label && <Label>{label}</Label>}
      <Select
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
      >
        {allowNone && <Option value="">{placeholder}</Option>}
        {colors.map((color) => (
          <Option key={color.id} value={color.id}>
            {color.name} ({color.hexCode})
          </Option>
        ))}
      </Select>
      <PreviewContainer>
        {selectedColor ? (
          <>
            <ColorPip color={selectedColor.hexCode} size="md" />
            <PreviewText>
              {selectedColor.name} ({selectedColor.hexCode})
            </PreviewText>
          </>
        ) : (
          <PreviewText>{placeholder}</PreviewText>
        )}
      </PreviewContainer>
    </SelectContainer>
  );
};
