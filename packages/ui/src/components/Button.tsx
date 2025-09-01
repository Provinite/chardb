import React from 'react';
import styled, { css } from 'styled-components';
import { Theme } from '../theme';

/**
 * Button - A flexible, themeable button component with multiple variants and icon support
 * 
 * Provides consistent button styling across the application with support for different
 * visual variants, sizes, loading states, and optional icons. Built with accessibility
 * in mind and integrates seamlessly with the application theme.
 * 
 * Features:
 * - Multiple visual variants (primary, secondary, outline, ghost)
 * - Three sizes (sm, md, lg) with appropriate spacing
 * - Loading state with visual indicator
 * - Optional icon support with proper spacing
 * - Disabled state handling
 * - Full accessibility support
 * - Can render as different elements (button, a, Link, etc.)
 * 
 * @example
 * ```tsx
 * // Basic primary button
 * <Button onClick={handleClick}>
 *   Save Changes
 * </Button>
 * 
 * // Button with icon
 * <Button 
 *   variant="primary" 
 *   icon={<Plus size={16} />}
 *   onClick={handleCreate}
 * >
 *   Create New
 * </Button>
 * 
 * // Secondary button with loading state
 * <Button 
 *   variant="secondary"
 *   loading={isSubmitting}
 *   onClick={handleSubmit}
 * >
 *   Submit Form
 * </Button>
 * 
 * // Outline button with custom size
 * <Button 
 *   variant="outline"
 *   size="lg"
 *   icon={<Download size={20} />}
 * >
 *   Download File
 * </Button>
 * 
 * // Ghost button for subtle actions
 * <Button variant="ghost" size="sm">
 *   Cancel
 * </Button>
 * 
 * // Disabled button
 * <Button disabled>
 *   Cannot Click
 * </Button>
 * 
 * // Button rendered as Link (requires router integration)
 * <Button 
 *   as={Link}
 *   to="/dashboard"
 *   variant="primary"
 *   icon={<ArrowRight size={16} />}
 * >
 *   Go to Dashboard
 * </Button>
 * 
 * // Submit button for forms
 * <Button type="submit" variant="primary">
 *   Submit
 * </Button>
 * ```
 */

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  as?: React.ElementType;
  to?: string;
  href?: string;
  /** Optional icon to display before the button text */
  icon?: React.ReactNode;
}

const getVariantStyles = (variant: string, theme: Theme) => {
  switch (variant) {
    case 'primary':
      return css`
        background-color: ${theme.colors.primary};
        color: white;
        border: 1px solid ${theme.colors.primary};
        
        &:hover:not(:disabled) {
          background-color: ${theme.colors.primary}e6;
          border-color: ${theme.colors.primary}e6;
        }
      `;
    case 'secondary':
      return css`
        background-color: ${theme.colors.secondary};
        color: white;
        border: 1px solid ${theme.colors.secondary};
        
        &:hover:not(:disabled) {
          opacity: 0.9;
        }
      `;
    case 'outline':
      return css`
        background-color: transparent;
        color: ${theme.colors.primary};
        border: 1px solid ${theme.colors.primary};
        
        &:hover:not(:disabled) {
          background-color: ${theme.colors.primary};
          color: white;
        }
      `;
    case 'ghost':
      return css`
        background-color: transparent;
        color: ${theme.colors.text.primary};
        border: 1px solid transparent;
        
        &:hover:not(:disabled) {
          background-color: ${theme.colors.surface};
        }
      `;
    default:
      return '';
  }
};

const getSizeStyles = (size: string, theme: Theme) => {
  switch (size) {
    case 'sm':
      return css`
        padding: ${theme.spacing.xs} ${theme.spacing.sm};
        font-size: ${theme.typography.fontSize.sm};
      `;
    case 'md':
      return css`
        padding: ${theme.spacing.sm} ${theme.spacing.md};
        font-size: ${theme.typography.fontSize.md};
      `;
    case 'lg':
      return css`
        padding: ${theme.spacing.md} ${theme.spacing.lg};
        font-size: ${theme.typography.fontSize.lg};
      `;
    default:
      return '';
  }
};

const StyledButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['variant', 'size', 'loading', 'isFollowing'].includes(prop as string)
})<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  
  ${({ variant = 'primary', theme }) => getVariantStyles(variant, theme)}
  ${({ size = 'md', theme }) => getSizeStyles(size, theme)}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: ${({ theme }) => theme.colors.text.muted} !important;
    border-color: ${({ theme }) => theme.colors.text.muted} !important;
    color: ${({ theme }) => theme.colors.background} !important;
  }
  
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  as,
  icon,
  ...props
}) => {
  return (
    <StyledButton
      as={as}
      variant={variant}
      size={size}
      disabled={disabled || loading}
      type={type}
      onClick={onClick}
      {...props}
    >
      {loading && <span>⏳</span>}
      {!loading && icon && icon}
      {children}
    </StyledButton>
  );
};