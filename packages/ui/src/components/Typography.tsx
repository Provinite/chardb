import styled from 'styled-components';

/**
 * Typography components for consistent text styling across the application.
 * Provides a standardized set of heading and text components with proper
 * hierarchy, spacing, and theme integration.
 */

export const Title = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
`;

export const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
  font-size: 1rem;
  line-height: 1.4;
`;

export const Heading2 = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
`;

export const Heading3 = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  line-height: 1.2;
`;

export const Heading4 = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
`;

export const Heading5 = styled.h5`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
`;

export const Text = styled.p`
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 1rem 0;
  line-height: 1.5;
`;

export const SmallText = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
`;

export const Caption = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  line-height: 1.3;
`;

export const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  display: block;
  margin-bottom: 0.5rem;
  line-height: 1.4;
`;

export const ErrorText = styled.span`
  color: ${({ theme }) => theme.colors.error};
  font-size: 0.875rem;
  line-height: 1.4;
`;

export const HelpText = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
  line-height: 1.4;
`;