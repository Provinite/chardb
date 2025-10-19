import React from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  Home,
  BarChart3,
  Users,
  Mail,
  Settings,
  Dna,
  Shield,
  Lock,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { CommunityNavigationItem } from './CommunityNavigationItem';
import { CommunityNavigationGroup } from './CommunityNavigationGroup';
import { useUserCommunityRole } from '../../hooks/useUserCommunityRole';

interface CommunityNavigationSidebarProps {
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

const CommunityHeader = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const CommunityName = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CommunityLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  padding: ${({ theme }) => `${theme.spacing.xs} 0`};

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const LoadingContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-align: center;
`;

const Divider = styled.div`
  height: 1px;
  background-color: ${({ theme }) => theme.colors.border};
  margin: ${({ theme }) => `${theme.spacing.sm} 0`};
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: auto;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surface};
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

/**
 * Checks if the current route is a community-scoped route
 */
const isCommunityRoute = (pathname: string): boolean => {
  const communityRoutes = [
    /^\/communities\/[^/]+/,
    // Add more patterns as needed
  ];
  return communityRoutes.some((pattern) => pattern.test(pathname));
};

export const CommunityNavigationSidebar: React.FC<CommunityNavigationSidebarProps> = ({
  className,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { communityId } = useParams<{ communityId: string }>();
  const {
    community,
    permissions,
    hasAdminPermissions,
    hasSpeciesPermissions,
    hasInvitePermissions,
    loading,
    isMember,
  } = useUserCommunityRole(communityId);

  // Only render sidebar for community-scoped routes
  if (!isCommunityRoute(location.pathname) || !communityId) {
    return null;
  }

  // Don't render if user is not a member
  if (!loading && !isMember) {
    return null;
  }

  const communityBasePath = `/communities/${communityId}`;

  return (
    <SidebarContainer className={className} role="navigation" aria-label="Community navigation">
      <CommunityHeader>
        <CommunityLink to={communityBasePath}>
          <Home />
          <CommunityName>{community?.name || 'Loading...'}</CommunityName>
        </CommunityLink>
      </CommunityHeader>

      {loading ? (
        <LoadingContainer>Loading navigation...</LoadingContainer>
      ) : (
        <SidebarContent>
          {/* Overview Section - Always visible to members */}
          <CommunityNavigationItem
            to={communityBasePath}
            icon={BarChart3}
            label="Overview"
          />

          <Divider />

          {/* Community Section */}
          <CommunityNavigationGroup title="Community" icon={Users}>
            {/* Members - visible to all community members */}
            <CommunityNavigationItem
              to={`${communityBasePath}/members`}
              icon={Users}
              label="Members"
              isNested
            />

            {/* Invite Codes - requires invite permissions */}
            {hasInvitePermissions && (
              <CommunityNavigationItem
                to={`${communityBasePath}/invite-codes`}
                icon={Mail}
                label="Invite Codes"
                isNested
              />
            )}

            {/* Settings - requires edit permissions (using admin as proxy for now) */}
            {hasAdminPermissions && (
              <CommunityNavigationItem
                to={`${communityBasePath}/settings`}
                icon={Settings}
                label="Settings"
                isNested
              />
            )}
          </CommunityNavigationGroup>

          {/* Species & Characters Section - requires species permissions */}
          {hasSpeciesPermissions && (
            <CommunityNavigationGroup title="Species & Characters" icon={Dna}>
              <CommunityNavigationItem
                to={`${communityBasePath}/species`}
                icon={Dna}
                label="Species Management"
                isNested
              />
            </CommunityNavigationGroup>
          )}

          {/* Administration Section - requires admin permissions */}
          {hasAdminPermissions && (
            <CommunityNavigationGroup title="Administration" icon={Shield}>
              <CommunityNavigationItem
                to={`${communityBasePath}/admin`}
                icon={Shield}
                label="Dashboard"
                isNested
              />

              {/* Permissions - requires role management permissions */}
              {(permissions.canCreateRole || permissions.canEditRole) && (
                <CommunityNavigationItem
                  to={`${communityBasePath}/permissions`}
                  icon={Lock}
                  label="Permissions"
                  isNested
                />
              )}

              {/* Moderation - requires member management permissions */}
              {permissions.canRemoveCommunityMember && (
                <CommunityNavigationItem
                  to={`${communityBasePath}/moderation`}
                  icon={AlertCircle}
                  label="Moderation"
                  isNested
                />
              )}
            </CommunityNavigationGroup>
          )}

          {/* Back to Global */}
          <BackButton onClick={() => navigate('/')}>
            <ArrowLeft />
            Back to Global
          </BackButton>
        </SidebarContent>
      )}
    </SidebarContainer>
  );
};
