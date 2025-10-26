import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
  BarChart3,
  Users,
  User,
  Mail,
  Settings,
  Dna,
  Shield,
  Lock,
  AlertCircle,
  Globe,
  LayoutGrid,
  Package,
} from 'lucide-react';
import { CommunityNavigationItem } from './CommunityNavigationItem';
import { CommunityNavigationGroup } from './CommunityNavigationGroup';
import { CommunitySwitcher } from './CommunitySwitcher';
import { GlobalNavigationSidebar } from './GlobalNavigationSidebar';
import { useUserCommunityRole } from '../../hooks/useUserCommunityRole';
import {
  useSpeciesByIdQuery,
  useGetCharacterQuery,
  useSpeciesVariantByIdQuery,
  useTraitByIdQuery,
} from '../../generated/graphql';

interface CommunityNavigationSidebarProps {
  className?: string;
  onToggleToGlobal?: () => void;
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

const DashboardLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surface};
  }

  svg {
    width: 18px;
    height: 18px;
  }
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

const SubsectionLabel = styled.div`
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.xl}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-style: italic;
`;

/**
 * Checks if the current route is a community-scoped route
 */
const isCommunityRoute = (pathname: string): boolean => {
  const communityRoutes = [
    /^\/communities\/[^/]+/,
    /^\/species\/[^/]+/,
    /^\/character\/[^/]+/,
    /^\/variants\/[^/]+/,
    /^\/traits\/[^/]+/,
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

/**
 * Extract character ID from pathname for character pages
 */
const extractCharacterId = (pathname: string): string | undefined => {
  const match = pathname.match(/^\/character\/([^/]+)/);
  return match ? match[1] : undefined;
};

/**
 * Extract variant ID from pathname for variant pages
 */
const extractVariantId = (pathname: string): string | undefined => {
  const match = pathname.match(/^\/variants\/([^/]+)/);
  return match ? match[1] : undefined;
};

/**
 * Extract trait ID from pathname for trait pages
 */
const extractTraitId = (pathname: string): string | undefined => {
  const match = pathname.match(/^\/traits\/([^/]+)/);
  return match ? match[1] : undefined;
};

export const CommunityNavigationSidebar: React.FC<CommunityNavigationSidebarProps> = ({
  className,
  onToggleToGlobal,
}) => {
  const location = useLocation();

  // Extract communityId from URL path instead of useParams (Layout is outside Routes)
  let communityId = extractCommunityId(location.pathname);
  const speciesId = extractSpeciesId(location.pathname);
  const characterId = extractCharacterId(location.pathname);
  const variantId = extractVariantId(location.pathname);
  const traitId = extractTraitId(location.pathname);

  // If we're on a species route, fetch the species to get its communityId
  const { data: speciesData, loading: speciesLoading } = useSpeciesByIdQuery({
    variables: { id: speciesId || '' },
    skip: !speciesId,
  });

  // If we're on a character route, fetch the character to get its species
  const { data: characterData, loading: characterLoading } = useGetCharacterQuery({
    variables: { id: characterId || '' },
    skip: !characterId,
  });

  // If we're on a variant route, fetch the variant to get its species
  const { data: variantData, loading: variantLoading } = useSpeciesVariantByIdQuery({
    variables: { id: variantId || '' },
    skip: !variantId,
  });

  // If we're on a trait route, fetch the trait to get its species
  const { data: traitData, loading: traitLoading } = useTraitByIdQuery({
    variables: { id: traitId || '' },
    skip: !traitId,
  });

  // Determine the species context (from species route, character, variant, or trait)
  let contextSpeciesId: string | undefined = speciesId;
  let contextSpeciesName: string | undefined = speciesData?.speciesById?.name;

  // Override communityId if we got it from species data
  if (speciesId && speciesData?.speciesById?.community?.id) {
    communityId = speciesData.speciesById.community.id;
  }

  // If on character route with species, use that for species context and community
  if (characterId && characterData?.character?.species) {
    contextSpeciesId = characterData.character.species.id;
    contextSpeciesName = characterData.character.species.name;

    // Get community from character's species
    if (characterData.character.species.community?.id) {
      communityId = characterData.character.species.community.id;
    }
  }

  // If on variant route, use its species for context and community
  if (variantId && variantData?.speciesVariantById?.species) {
    contextSpeciesId = variantData.speciesVariantById.species.id;
    contextSpeciesName = variantData.speciesVariantById.species.name;

    // Get community from variant's species
    communityId = variantData.speciesVariantById.species.communityId;
  }

  // If on trait route, use its species for context and community
  if (traitId && traitData?.traitById?.species) {
    contextSpeciesId = traitData.traitById.species.id;
    contextSpeciesName = traitData.traitById.species.name;

    // Get community from trait's species
    communityId = traitData.traitById.species.communityId;
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
    characterId,
    variantId,
    traitId,
    contextSpeciesId,
    contextSpeciesName,
    speciesLoading,
    characterLoading,
    variantLoading,
    traitLoading,
    isCommunityRoute: isCommunityRoute(location.pathname),
    loading,
    isMember,
    hasError: !!error,
    error: error?.message,
  });

  // Only render sidebar for community-scoped routes
  if (!isCommunityRoute(location.pathname)) {
    console.log('[CommunityNavigationSidebar] Not rendering - not a community route, showing global sidebar');
    return <GlobalNavigationSidebar onToggleToCommunity={undefined} />;
  }

  // Show loading state while checking membership, species data, character data, variant data, or trait data
  if (
    loading ||
    (speciesId && speciesLoading) ||
    (characterId && characterLoading) ||
    (variantId && variantLoading) ||
    (traitId && traitLoading)
  ) {
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
    console.log('[CommunityNavigationSidebar] Not rendering - no communityId after loading, showing global sidebar');
    return <GlobalNavigationSidebar onToggleToCommunity={undefined} />;
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
    console.log('[CommunityNavigationSidebar] Not rendering - user is not a member, showing global sidebar');
    return <GlobalNavigationSidebar onToggleToCommunity={undefined} />;
  }

  console.log('[CommunityNavigationSidebar] Rendering full sidebar');

  const communityBasePath = `/communities/${communityId}`;

  return (
    <SidebarContainer className={className} role="navigation" aria-label="Community navigation">
      <CommunityHeader>
        <CommunitySwitcher communityId={communityId} />
        {onToggleToGlobal && (
          <ToggleButton onClick={onToggleToGlobal} aria-label="View global navigation">
            <Globe />
            View Global Navigation
          </ToggleButton>
        )}
        <DashboardLink to="/dashboard">
          <LayoutGrid />
          Dashboard
        </DashboardLink>
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

            {/* Inventory - visible to all community members */}
            <CommunityNavigationItem
              to={`${communityBasePath}/inventory`}
              icon={Package}
              label="Inventory"
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
            <>
              <Divider />
              <CommunityNavigationGroup title="Species & Characters" icon={Dna}>
                {/* Current Species Context - shown when viewing a specific species or character */}
                {contextSpeciesId && (
                  <>
                    <SubsectionLabel>Current: {contextSpeciesName || 'Loading...'}</SubsectionLabel>
                    <CommunityNavigationItem
                      to={`/species/${contextSpeciesId}`}
                      icon={Dna}
                      label="Overview"
                      isNested
                    />
                    {hasSpeciesPermissions && (
                      <CommunityNavigationItem
                        to={`/species/${contextSpeciesId}/traits`}
                        icon={Settings}
                        label="Traits"
                        isNested
                      />
                    )}
                    {hasSpeciesPermissions && (
                      <CommunityNavigationItem
                        to={`/species/${contextSpeciesId}/variants`}
                        icon={Dna}
                        label="Variants"
                        isNested
                      />
                    )}
                    <Divider />
                  </>
                )}

                {/* Always visible species management links */}
                <CommunityNavigationItem
                  to={`${communityBasePath}/characters`}
                  icon={User}
                  label="Browse Characters"
                  isNested
                />
                <CommunityNavigationItem
                  to={`${communityBasePath}/species`}
                  icon={Dna}
                  label="Species Management"
                  isNested
                />
              </CommunityNavigationGroup>
            </>
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

              {/* Items - requires admin permissions */}
              <CommunityNavigationItem
                to={`${communityBasePath}/admin/items`}
                icon={Package}
                label="Items"
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
        </SidebarContent>
      )}
    </SidebarContainer>
  );
};
