import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  User,
  Heart,
  Activity,
  LayoutGrid,
  Image,
  Users,
  Plus,
  Building2,
  Search,
} from 'lucide-react';
import { spotlight } from '@mantine/spotlight';
import { CommunityNavigationItem } from './CommunityNavigationItem';
import { CommunityNavigationGroup } from './CommunityNavigationGroup';
import { useAuth } from '../../contexts/AuthContext';
import { useCommunityMembersByUserQuery } from '../../generated/graphql';

interface GlobalNavigationSidebarProps {
  className?: string;
  onToggleToCommunity?: () => void;
}

const SidebarContainer = styled.aside`
  width: 280px;
  height: 100vh;
  background-color: ${({ theme }) => theme.colors.background};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  position: sticky;
  top: 0;
  flex-shrink: 0;

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

const SidebarContent = styled.nav`
  padding: ${({ theme }) => theme.spacing.md};
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const SidebarHeader = styled(Link)`
  padding: ${({ theme}) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surface};
  }
`;

const Divider = styled.div`
  height: 1px;
  background-color: ${({ theme }) => theme.colors.border};
  margin: ${({ theme }) => `${theme.spacing.sm} 0`};
`;

const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.xs};
  width: 100%;
  padding: ${({ theme }) => theme.spacing.xs};
  background: ${({ theme }) => theme.colors.primary}15;
  border: 1px solid ${({ theme }) => theme.colors.primary}40;
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s ease;
  margin: ${({ theme }) => theme.spacing.sm} 0;

  &:hover {
    background: ${({ theme }) => theme.colors.primary}25;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const SearchTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Kbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  padding: 0 ${({ theme }) => theme.spacing.xs};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-family: inherit;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const LoadingContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-align: center;
`;

export const GlobalNavigationSidebar: React.FC<GlobalNavigationSidebarProps> = ({
  className,
  onToggleToCommunity,
}) => {
  const { user } = useAuth();

  // Fetch user's communities
  const { data: communitiesData, loading: communitiesLoading } = useCommunityMembersByUserQuery({
    variables: { userId: user?.id || '', first: 50 },
    skip: !user?.id,
  });

  const communities = communitiesData?.communityMembersByUser?.nodes?.map((m) => m.role.community) || [];

  return (
    <SidebarContainer className={className} role="navigation" aria-label="Global navigation">
      <SidebarHeader to="/dashboard">
        <LayoutGrid size={20} />
        Dashboard
      </SidebarHeader>

      <SidebarContent>
        <SearchTrigger onClick={() => spotlight.open()} aria-label="Search pages">
          <Search size={16} />
          Search...
          <Kbd>Ctrl+K</Kbd>
        </SearchTrigger>

        {onToggleToCommunity && (
          <ToggleButton onClick={onToggleToCommunity} aria-label="View community navigation">
            <Building2 />
            View Community Navigation
          </ToggleButton>
        )}

        {/* Personal Content Section */}
        <CommunityNavigationGroup title="My Content" icon={User} defaultExpanded>
          <CommunityNavigationItem
            to="/my/characters"
            icon={User}
            label="My Characters"
            isNested
          />
          <CommunityNavigationItem
            to="/my/galleries"
            icon={LayoutGrid}
            label="My Galleries"
            isNested
          />
          <CommunityNavigationItem
            to="/my/media"
            icon={Image}
            label="My Media"
            isNested
          />
        </CommunityNavigationGroup>

        <Divider />

        {/* Liked Content Section */}
        <CommunityNavigationGroup title="Liked" icon={Heart}>
          <CommunityNavigationItem
            to="/liked/characters"
            icon={User}
            label="Characters"
            isNested
          />
          <CommunityNavigationItem
            to="/liked/galleries"
            icon={LayoutGrid}
            label="Galleries"
            isNested
          />
          <CommunityNavigationItem
            to="/liked/media"
            icon={Image}
            label="Media"
            isNested
          />
        </CommunityNavigationGroup>

        <Divider />

        {/* Activity Section */}
        <CommunityNavigationItem
          to="/feed"
          icon={Activity}
          label="Activity Feed"
        />

        <CommunityNavigationItem
          to={`/user/${user?.username || ''}`}
          icon={User}
          label="My Profile"
        />

        <Divider />

        {/* Browse Section */}
        <CommunityNavigationGroup title="Browse" icon={LayoutGrid}>
          <CommunityNavigationItem
            to="/characters"
            icon={User}
            label="All Characters"
            isNested
          />
          <CommunityNavigationItem
            to="/galleries"
            icon={LayoutGrid}
            label="All Galleries"
            isNested
          />
          <CommunityNavigationItem
            to="/media"
            icon={Image}
            label="All Media"
            isNested
          />
        </CommunityNavigationGroup>

        <Divider />

        {/* Communities Section */}
        <CommunityNavigationGroup title="Communities" icon={Users} defaultExpanded>
          {communitiesLoading ? (
            <LoadingContainer>Loading communities...</LoadingContainer>
          ) : communities.length > 0 ? (
            <>
              {communities.map((community) => (
                <CommunityNavigationItem
                  key={community.id}
                  to={`/communities/${community.id}`}
                  icon={Users}
                  label={community.name}
                  isNested
                />
              ))}
              <Divider />
              <CommunityNavigationItem
                to="/my/communities"
                icon={Users}
                label="View All"
                isNested
              />
            </>
          ) : (
            <LoadingContainer>No communities yet</LoadingContainer>
          )}
          <CommunityNavigationItem
            to="/join-community"
            icon={Plus}
            label="Join Community"
            isNested
          />
        </CommunityNavigationGroup>
      </SidebarContent>
    </SidebarContainer>
  );
};
