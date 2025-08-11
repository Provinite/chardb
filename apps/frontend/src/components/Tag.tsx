import React from 'react';
import styled from 'styled-components';

const StyledTag = styled.span<{ variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'; size?: 'sm' | 'md'; customColor?: string }>`
  display: inline-block;
  padding: ${({ theme, size = 'md' }) => 
    size === 'sm' 
      ? `${theme.spacing.xs} ${theme.spacing.sm}` 
      : `${theme.spacing.sm} ${theme.spacing.md}`
  };
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme, size = 'md' }) => 
    size === 'sm' 
      ? theme.typography.fontSize.xs 
      : theme.typography.fontSize.sm
  };
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  background: ${({ theme, variant = 'default', customColor }) => {
    if (customColor) return customColor + '20';
    switch (variant) {
      case 'primary': return theme.colors.primary + '20';
      case 'success': return theme.colors.success + '20';
      case 'warning': return theme.colors.warning + '20';
      case 'error': return theme.colors.error + '20';
      default: return theme.colors.surface;
    }
  }};
  color: ${({ theme, variant = 'default', customColor }) => {
    if (customColor) return customColor;
    switch (variant) {
      case 'primary': return theme.colors.primary;
      case 'success': return theme.colors.success;
      case 'warning': return theme.colors.warning;
      case 'error': return theme.colors.error;
      default: return theme.colors.text.secondary;
    }
  }};
  border: 1px solid ${({ theme, variant = 'default', customColor }) => {
    if (customColor) return customColor + '40';
    switch (variant) {
      case 'primary': return theme.colors.primary + '40';
      case 'success': return theme.colors.success + '40';
      case 'warning': return theme.colors.warning + '40';
      case 'error': return theme.colors.error + '40';
      default: return theme.colors.border;
    }
  }};
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }
`;

export interface TagProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  color?: string;
  className?: string;
  onClick?: () => void;
}

export const Tag: React.FC<TagProps> = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  color,
  className,
  onClick
}) => {
  return (
    <StyledTag 
      variant={variant} 
      size={size}
      customColor={color}
      className={className}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </StyledTag>
  );
};