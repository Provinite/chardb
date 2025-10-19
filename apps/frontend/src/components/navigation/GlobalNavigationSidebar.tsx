import React from 'react';
import styled from 'styled-components';
import {
  User,
  Heart,
  Activity,
  LayoutGrid,
  Image,
  Users,
  Plus,
} from 'lucide-react';
import { CommunityNavigationItem } from './CommunityNavigationItem';
import { CommunityNavigationGroup } from './CommunityNavigationGroup';
import { useAuth } from '../../contexts/AuthContext';
import { useCommunityMembersByUserQuery } from '../../generated/graphql';

interface GlobalNavigationSidebarProps {
  className?: string;
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

const SidebarHeader = styled.div`
  padding: ${({ theme}) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Divider = styled.div`
  height: 1px;
  background-color: ${({ theme }) => theme.colors.border};
  margin: ${({ theme }) => `${theme.spacing.sm} 0`};
`;

const LoadingContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-align: center;
`;

export const GlobalNavigationSidebar: React.FC<GlobalNavigationSidebarProps> = ({
  className,
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
      <SidebarHeader>
        <LayoutGrid size={20} />
        Navigation
      </SidebarHeader>

      <SidebarContent>
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
          to="/profile/edit"
          icon={User}
          label="Edit Profile"
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
