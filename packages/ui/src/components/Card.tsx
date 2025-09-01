import React from 'react';
import styled from 'styled-components';

/**
 * Reusable Card component for consistent styling across the application.
 * Provides a consistent surface with hover effects, border, and shadow.
 */

interface CardProps {
  /** Card content */
  children: React.ReactNode;
  /** Optional click handler - makes card clickable */
  onClick?: () => void;
  /** Whether card should show clickable styling */
  clickable?: boolean;
  /** Additional CSS class name */
  className?: string;
}

export const Card = styled.div<{ clickable?: boolean }>`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 1.5rem;
  transition: all 0.2s ease;
  
  ${({ clickable }) => clickable && `
    cursor: pointer;
  `}

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

export const CardTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  line-height: 1.2;
`;

export const CardSubtitle = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0.25rem 0 0 0;
`;

export const CardContent = styled.div`
  color: ${({ theme }) => theme.colors.text};
`;

export const CardMeta = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
  margin-bottom: 1rem;
  
  p {
    margin: 0.25rem 0;
  }
`;

export const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 1rem;
`;

export const CardBadge = styled.span`
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
`;

export const CardSection = styled.div`
  margin: 1rem 0;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.background};
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

export const CardSectionTitle = styled.h4`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const CardSectionContent = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;