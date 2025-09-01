import React from 'react';
import styled from 'styled-components';
import { AlertCircle } from 'lucide-react';

/**
 * Styled error card with theme-based error colors and subtle background
 */
const ErrorCard = styled.div`
  background: ${({ theme }) => theme.colors.error + '10'};
  border: 1px solid ${({ theme }) => theme.colors.error + '30'};
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

/**
 * Header section containing the error icon and title
 */
const ErrorHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

/**
 * Styled title text with error color and medium font weight
 */
const ErrorTitle = styled.span`
  color: ${({ theme }) => theme.colors.error};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

/**
 * Error message text with proper styling and spacing
 */
const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.error};
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

/**
 * Props for the ErrorMessage component
 */
interface ErrorMessageProps {
  /** The error message text to display */
  message: string;
  /** Optional custom title for the error (defaults to "Error") */
  title?: string;
}

/**
 * ErrorMessage - A reusable error display component with consistent theming
 * 
 * Displays error messages in a styled card with an alert icon and customizable title.
 * Uses theme colors for consistent error styling across the application.
 * 
 * @example
 * ```tsx
 * // Basic usage with just a message
 * <ErrorMessage message="Failed to load data" />
 * 
 * // With custom title
 * <ErrorMessage 
 *   title="Network Error" 
 *   message="Unable to connect to the server. Please try again later." 
 * />
 * 
 * // In a GraphQL error scenario
 * if (error) {
 *   return <ErrorMessage message={error.message} title="GraphQL Error" />;
 * }
 * 
 * // In a form validation scenario
 * <ErrorMessage 
 *   title="Validation Failed" 
 *   message="Please check the required fields and try again." 
 * />
 * ```
 * 
 * @param props - The component props
 * @param props.message - The error message text to display
 * @param props.title - Optional custom title (defaults to "Error")
 * @returns A styled error message component
 */
export function ErrorMessage({ message, title = 'Error' }: ErrorMessageProps) {
  return (
    <ErrorCard>
      <ErrorHeader>
        <AlertCircle size={20} color="currentColor" />
        <ErrorTitle>{title}</ErrorTitle>
      </ErrorHeader>
      <ErrorText>{message}</ErrorText>
    </ErrorCard>
  );
}