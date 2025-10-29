import React from 'react';
import styled from 'styled-components';

const Pip = styled.div<{ $color: string; $size: 'sm' | 'md' | 'lg' }>`
  width: ${({ $size }) => {
    switch ($size) {
      case 'sm': return '12px';
      case 'md': return '16px';
      case 'lg': return '24px';
    }
  }};
  height: ${({ $size }) => {
    switch ($size) {
      case 'sm': return '12px';
      case 'md': return '16px';
      case 'lg': return '24px';
    }
  }};
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
  border: 2px solid ${({ theme }) => theme.colors.border};
  display: inline-block;
  flex-shrink: 0;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const Container = styled.span<{ $hasLabel: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme, $hasLabel }) => $hasLabel ? theme.spacing.sm : 0};
`;

const Label = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export interface ColorPipProps {
  color: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * A small circular color indicator (pip) that displays a color.
 * Can optionally include a text label next to the pip.
 */
export const ColorPip: React.FC<ColorPipProps> = ({
  color,
  label,
  size = 'md',
  className,
}) => {
  return (
    <Container $hasLabel={!!label} className={className}>
      <Pip $color={color} $size={size} />
      {label && <Label>{label}</Label>}
    </Container>
  );
};
