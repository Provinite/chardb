import React from 'react';
import styled, { css } from 'styled-components';
import { Theme } from '../theme';

/**
 * Alert - A versatile alert/notification component with multiple variants
 *
 * Provides contextual feedback messages with appropriate styling based on the
 * type of information being displayed. Built with accessibility in mind.
 *
 * Features:
 * - Multiple variants (info, success, warning, error)
 * - Optional icon support
 * - Dismissible with close button
 * - Theme-based styling
 * - Accessible ARIA attributes
 *
 * @example
 * ```tsx
 * // Success alert
 * <Alert variant="success">
 *   Character created successfully!
 * </Alert>
 *
 * // Error alert with icon
 * <Alert variant="error" icon={<AlertCircle size={20} />}>
 *   Failed to save changes. Please try again.
 * </Alert>
 *
 * // Dismissible alert
 * const [isVisible, setIsVisible] = useState(true);
 *
 * {isVisible && (
 *   <Alert
 *     variant="info"
 *     dismissible
 *     onDismiss={() => setIsVisible(false)}
 *   >
 *     You have 3 new notifications
 *   </Alert>
 * )}
 *
 * // Warning alert
 * <Alert variant="warning">
 *   This action cannot be undone. Please proceed with caution.
 * </Alert>
 * ```
 */

interface AlertProps {
  /** Visual variant of the alert */
  variant?: 'info' | 'success' | 'warning' | 'error';
  /** Content of the alert */
  children: React.ReactNode;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Whether the alert can be dismissed */
  dismissible?: boolean;
  /** Callback when alert is dismissed */
  onDismiss?: () => void;
  /** Additional className for styling */
  className?: string;
}

const getVariantStyles = (variant: string, theme: Theme) => {
  switch (variant) {
    case 'success':
      return css`
        background-color: ${theme.colors.success + '15'};
        border-color: ${theme.colors.success};
        color: ${theme.colors.success};
      `;
    case 'warning':
      return css`
        background-color: ${theme.colors.warning + '15'};
        border-color: ${theme.colors.warning};
        color: ${theme.colors.warning};
      `;
    case 'error':
      return css`
        background-color: ${theme.colors.error + '15'};
        border-color: ${theme.colors.error};
        color: ${theme.colors.error};
      `;
    case 'info':
    default:
      return css`
        background-color: ${theme.colors.info + '15'};
        border-color: ${theme.colors.info};
        color: ${theme.colors.info};
      `;
  }
};

const AlertContainer = styled.div<{ variant: string }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border-left: 4px solid;
  ${({ variant, theme }) => getVariantStyles(variant, theme)}
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.5;
`;

const AlertIcon = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
`;

const AlertContent = styled.div`
  flex: 1;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const DismissButton = styled.button<{ variant: string }>`
  flex-shrink: 0;
  background: transparent;
  border: none;
  padding: ${({ theme }) => theme.spacing.xs};
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    opacity: 1;
    background-color: currentColor;
    color: ${({ theme }) => theme.colors.background};
  }

  &:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`;

const CloseIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 4L4 12M4 4L12 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Alert component for displaying contextual notifications and messages
 */
export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  children,
  icon,
  dismissible = false,
  onDismiss,
  className,
}) => {
  const roleMap = {
    info: 'status',
    success: 'status',
    warning: 'alert',
    error: 'alert',
  };

  return (
    <AlertContainer
      variant={variant}
      className={className}
      role={roleMap[variant]}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
    >
      {icon && <AlertIcon>{icon}</AlertIcon>}
      <AlertContent>{children}</AlertContent>
      {dismissible && onDismiss && (
        <DismissButton
          variant={variant}
          onClick={onDismiss}
          aria-label="Dismiss alert"
          type="button"
        >
          <CloseIcon />
        </DismissButton>
      )}
    </AlertContainer>
  );
};
