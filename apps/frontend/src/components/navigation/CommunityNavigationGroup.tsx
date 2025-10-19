import React, { useState } from 'react';
import styled from 'styled-components';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';

interface CommunityNavigationGroupProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const GroupContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const GroupHeader = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.md}`};
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: ${({ theme }) => theme.borderRadius.md};

  &:hover {
    background-color: ${({ theme }) => theme.colors.surface};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

const GroupTitle = styled.span`
  flex: 1;
  text-align: left;
`;

const ChevronIcon = styled.span<{ $isExpanded: boolean }>`
  display: flex;
  transition: transform 0.2s ease;
  transform: rotate(${({ $isExpanded }) => ($isExpanded ? '0deg' : '0deg')});
`;

const GroupContent = styled.div<{ $isExpanded: boolean }>`
  display: ${({ $isExpanded }) => ($isExpanded ? 'block' : 'none')};
  padding-top: ${({ theme }) => theme.spacing.xs};
`;

export const CommunityNavigationGroup: React.FC<
  CommunityNavigationGroupProps
> = ({ title, icon: Icon, children, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <GroupContainer>
      <GroupHeader
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title} section`}
      >
        {Icon && <Icon />}
        <GroupTitle>{title}</GroupTitle>
        <ChevronIcon $isExpanded={isExpanded}>
          {isExpanded ? <ChevronDown /> : <ChevronRight />}
        </ChevronIcon>
      </GroupHeader>
      <GroupContent $isExpanded={isExpanded}>{children}</GroupContent>
    </GroupContainer>
  );
};
