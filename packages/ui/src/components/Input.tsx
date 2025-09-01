import React from 'react';
import styled from 'styled-components';

/**
 * Base input field with theme-based styling and focus states
 */
const StyledInput = styled.input<{ hasError?: boolean }>`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.border};
  border-radius: 6px;
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-family: inherit;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme, hasError }) => 
      hasError ? theme.colors.error + '20' : theme.colors.primary + '20'
    };
  }
  
  &:disabled {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text.secondary};
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.secondary};
    opacity: 0.7;
  }
`;

/**
 * Styled textarea with consistent styling matching input fields
 */
const StyledTextArea = styled.textarea<{ hasError?: boolean }>`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.border};
  border-radius: 6px;
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-family: inherit;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  resize: vertical;
  min-height: 80px;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme, hasError }) => 
      hasError ? theme.colors.error + '20' : theme.colors.primary + '20'
    };
  }
  
  &:disabled {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text.secondary};
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.secondary};
    opacity: 0.7;
  }
`;

/**
 * Props for the Input component
 */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Whether this input has validation errors */
  hasError?: boolean;
  /** Whether to render as a textarea instead of input */
  multiline?: boolean;
  /** Number of rows for textarea (when multiline=true) */
  rows?: number;
}

/**
 * Input - A versatile form input component with theme integration and error states
 * 
 * Provides a consistent styled input field that integrates with the application theme.
 * Supports both single-line inputs and multi-line textareas with proper focus states,
 * error styling, and accessibility features.
 * 
 * Features:
 * - Theme-based styling with consistent colors and spacing
 * - Error state styling with red borders and focus rings
 * - Disabled state with appropriate visual feedback
 * - Placeholder text with proper contrast
 * - Smooth transitions for interactive states
 * - Support for both input and textarea variants
 * - Full accessibility support with proper focus management
 * 
 * @example
 * ```tsx
 * // Basic text input
 * <Input 
 *   type="text" 
 *   placeholder="Enter your name" 
 *   value={name}
 *   onChange={(e) => setName(e.target.value)}
 * />
 * 
 * // Email input with error state
 * <Input 
 *   type="email" 
 *   placeholder="Enter your email"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 *   hasError={emailError}
 *   required
 * />
 * 
 * // Multi-line textarea
 * <Input 
 *   multiline
 *   rows={4}
 *   placeholder="Enter your message"
 *   value={message}
 *   onChange={(e) => setMessage(e.target.value)}
 * />
 * 
 * // Disabled input
 * <Input 
 *   type="text" 
 *   value="Read-only value"
 *   disabled
 * />
 * 
 * // In a form with validation
 * const [errors, setErrors] = useState({});
 * 
 * <form onSubmit={handleSubmit}>
 *   <Input 
 *     name="username"
 *     type="text"
 *     placeholder="Username"
 *     hasError={!!errors.username}
 *     required
 *   />
 *   {errors.username && <span>{errors.username}</span>}
 * </form>
 * 
 * // Search input with custom styling
 * <Input 
 *   type="search"
 *   placeholder="Search communities..."
 *   value={searchTerm}
 *   onChange={(e) => setSearchTerm(e.target.value)}
 *   style={{ maxWidth: '400px' }}
 * />
 * ```
 * 
 * @param props - The component props extending standard HTML input attributes
 * @param props.hasError - Whether to display error styling (red border/focus ring)
 * @param props.multiline - Whether to render as textarea instead of input
 * @param props.rows - Number of rows for textarea (defaults to browser default)
 * @returns A styled input or textarea component
 */
export function Input({ hasError = false, multiline = false, rows, ...props }: InputProps) {
  if (multiline) {
    // TypeScript workaround: textarea props are different from input props
    const textAreaProps = props as React.TextareaHTMLAttributes<HTMLTextAreaElement>;
    return <StyledTextArea hasError={hasError} rows={rows} {...textAreaProps} />;
  }
  
  return <StyledInput hasError={hasError} {...props} />;
}