import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
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
import { CommunitySwitcher } from './CommunitySwitcher';
import { useUserCommunityRole } from '../../hooks/useUserCommunityRole';
import { useSpeciesByIdQuery } from '../../generated/graphql';

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
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
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
    /^\/species\/[^/]+/,  // Species routes also get sidebar
    // Add more patterns as needed
  ];
  return communityRoutes.some((pattern) => pattern.test(pathname));
};

/**
 * Extract community ID from pathname since Layout is outside Routes
 * and useParams() won't work
 */
const extractCommunityId = (pathname: string): string | undefined => {
  const match = pathname.match(/^\/communities\/([^/]+)/);
  return match ? match[1] : undefined;
};

/**
 * Extract species ID from pathname for species-specific routes
 */
const extractSpeciesId = (pathname: string): string | undefined => {
  const match = pathname.match(/^\/species\/([^/]+)/);
  return match ? match[1] : undefined;
};

export const CommunityNavigationSidebar: React.FC<CommunityNavigationSidebarProps> = ({
  className,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract communityId from URL path instead of useParams (Layout is outside Routes)
  let communityId = extractCommunityId(location.pathname);
  const speciesId = extractSpeciesId(location.pathname);

  // If we're on a species route, fetch the species to get its communityId
  const { data: speciesData, loading: speciesLoading } = useSpeciesByIdQuery({
    variables: { id: speciesId || '' },
    skip: !speciesId,
  });

  // Override communityId if we got it from species data
  if (speciesId && speciesData?.speciesById?.community?.id) {
    communityId = speciesData.speciesById.community.id;
  }

  const {
    permissions,
    hasAdminPermissions,
    hasSpeciesPermissions,
    hasInvitePermissions,
    loading,
    isMember,
    error,
  } = useUserCommunityRole(communityId);

  // Debug logging
  console.log('[CommunityNavigationSidebar] Debug Info:', {
    pathname: location.pathname,
    communityId,
    speciesId,
    speciesLoading,
    isCommunityRoute: isCommunityRoute(location.pathname),
    loading,
    isMember,
    hasError: !!error,
    error: error?.message,
  });

  // Only render sidebar for community-scoped routes
  if (!isCommunityRoute(location.pathname)) {
    console.log('[CommunityNavigationSidebar] Not rendering - not a community route');
    return null;
  }

  // Show loading state while checking membership or species data
  if (loading || (speciesId && speciesLoading)) {
    console.log('[CommunityNavigationSidebar] Showing loading state');
    return (
      <SidebarContainer className={className} role="navigation" aria-label="Community navigation">
        <CommunityHeader>
          <LoadingContainer>Loading...</LoadingContainer>
        </CommunityHeader>
      </SidebarContainer>
    );
  }

  // After loading, check if we have a communityId
  if (!communityId) {
    console.log('[CommunityNavigationSidebar] Not rendering - no communityId after loading');
    return null;
  }

  // Show error state if query failed
  if (error) {
    console.error('[CommunityNavigationSidebar] GraphQL Error:', error);
    return (
      <SidebarContainer className={className} role="navigation" aria-label="Community navigation">
        <CommunityHeader>
          <LoadingContainer style={{ color: 'red' }}>
            Error loading community data
          </LoadingContainer>
        </CommunityHeader>
      </SidebarContainer>
    );
  }

  // Don't render if user is not a member
  if (!isMember) {
    console.log('[CommunityNavigationSidebar] Not rendering - user is not a member');
    return null;
  }

  console.log('[CommunityNavigationSidebar] Rendering full sidebar');

  const communityBasePath = `/communities/${communityId}`;

  return (
    <SidebarContainer className={className} role="navigation" aria-label="Community navigation">
      <CommunityHeader>
        <CommunitySwitcher />
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
