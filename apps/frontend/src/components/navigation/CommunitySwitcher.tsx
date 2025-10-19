import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { ChevronDown, Check, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCommunityMembersByUserQuery } from '../../generated/graphql';

interface CommunitySwitcherProps {
  className?: string;
  communityId?: string;
}

const SwitcherContainer = styled.div`
  position: relative;
`;

const SwitcherButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  background-color: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background-color: ${({ theme }) => theme.colors.background};
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

const CommunityName = styled.span`
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: ${({ theme }) => theme.spacing.sm};
`;

const Dropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background-color: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
  display: ${({ $isOpen }) => ($isOpen ? 'block' : 'none')};

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.borderRadius.full};
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.text.muted};
  }
`;

const SearchContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.sm};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: sticky;
  top: 0;
  background-color: ${({ theme }) => theme.colors.background};
  z-index: 1;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  padding-left: ${({ theme }) => theme.spacing.xl};
  background-color: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: ${({ theme }) => theme.spacing.md};
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: ${({ theme }) => theme.colors.text.muted};
  pointer-events: none;
`;

const SearchWrapper = styled.div`
  position: relative;
`;

const CommunityList = styled.div`
  padding: ${({ theme }) => theme.spacing.xs};
`;

const CommunityItem = styled.button<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  background-color: ${({ theme, $isActive }) =>
    $isActive ? `${theme.colors.primary}15` : 'transparent'};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  color: ${({ theme, $isActive }) =>
    $isActive ? theme.colors.primary : theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surface};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

const CommunityItemName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Divider = styled.div`
  height: 1px;
  background-color: ${({ theme }) => theme.colors.border};
  margin: ${({ theme }) => `${theme.spacing.xs} 0`};
`;

const BrowseAllButton = styled.button`
  display: block;
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  background-color: transparent;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surface};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`;

const EmptyState = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

export const CommunitySwitcher: React.FC<CommunitySwitcherProps> = ({
  className,
  communityId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, loading } = useCommunityMembersByUserQuery({
    variables: { userId: user?.id || '', first: 100 },
    skip: !user?.id,
  });

  const communities =
    data?.communityMembersByUser?.nodes?.map((m) => m.role.community) || [];
  const currentCommunity = communities.find((c) => c.id === communityId);

  // Filter communities based on search query
  const filteredCommunities = communities.filter((community) =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCommunitySelect = (selectedCommunityId: string) => {
    navigate(`/communities/${selectedCommunityId}`);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleBrowseAll = () => {
    navigate('/my/communities');
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <SwitcherContainer ref={containerRef} className={className}>
      <SwitcherButton
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Switch community"
      >
        <CommunityName>
          {loading
            ? 'Loading...'
            : currentCommunity?.name || 'Select Community'}
        </CommunityName>
        <ChevronDown />
      </SwitcherButton>

      <Dropdown $isOpen={isOpen} role="listbox">
        <SearchContainer>
          <SearchWrapper>
            <SearchIcon />
            <SearchInput
              type="text"
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </SearchWrapper>
        </SearchContainer>

        <CommunityList>
          {filteredCommunities.length === 0 ? (
            <EmptyState>
              {searchQuery
                ? 'No communities found'
                : 'You are not a member of any communities'}
            </EmptyState>
          ) : (
            filteredCommunities.map((community) => (
              <CommunityItem
                key={community.id}
                $isActive={community.id === communityId}
                onClick={() => handleCommunitySelect(community.id)}
                role="option"
                aria-selected={community.id === communityId}
              >
                <CommunityItemName>{community.name}</CommunityItemName>
                {community.id === communityId && <Check />}
              </CommunityItem>
            ))
          )}
        </CommunityList>

        {communities.length > 0 && (
          <>
            <Divider />
            <div style={{ padding: '4px' }}>
              <BrowseAllButton onClick={handleBrowseAll}>
                Browse All Communities →
              </BrowseAllButton>
            </div>
          </>
        )}
      </Dropdown>
    </SwitcherContainer>
  );
};
