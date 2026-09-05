import React from "react";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import {
  ArrowLeftRight,
  BarChart3,
  Users,
  User,
  Mail,
  Settings,
  Dna,
  Shield,
  Lock,
  Image,
  ClipboardCheck,
  ShieldCheck,
  Globe,
  LayoutGrid,
  Package,
  ScrollText,
  Search,
  Coins,
  ShoppingCart,
  Store,
  Receipt,
} from "lucide-react";
import { spotlight } from "@mantine/spotlight";
import { CommunityNavigationItem } from "./CommunityNavigationItem";
import { CommunityNavigationGroup } from "./CommunityNavigationGroup";
import { CommunitySwitcher } from "./CommunitySwitcher";
import { GlobalNavigationSidebar } from "./GlobalNavigationSidebar";
import { useUserCommunityRole } from "../../hooks/useUserCommunityRole";
import { useCommunityHost } from "../../contexts/CommunityHostContext";
import {
  useSpeciesByIdQuery,
  useGetCharacterQuery,
  useSpeciesVariantByIdQuery,
  useTraitByIdQuery,
} from "../../generated/graphql";

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

  @media (max-width: 768px) {
    display: none;
  }
`;

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform);

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
 * Extract species ID from pathname, for the "Current species" subsection.
 *
 * The only pathname regex left here. There used to be six, plus five GraphQL
 * queries behind them, and their job was to work out which community the page
 * belonged to -- `Layout` mounts outside `<Routes>`, so `useParams()` was not
 * available and the id had to be recovered from whatever the URL happened to
 * carry (#293). The hostname answers that now.
 *
 * What remains is a different question: which species is being looked at, so
 * the sidebar can offer its traits and variants. That is display context, not
 * routing, and it still has to be read from the path.
 */
const extractSpeciesId = (pathname: string): string | undefined => {
  const match = pathname.match(/^\/species\/([^/]+)/);
  return match ? match[1] : undefined;
};

const extractCharacterId = (pathname: string): string | undefined => {
  const match = pathname.match(/^\/character\/([^/]+)/);
  return match ? match[1] : undefined;
};

const extractVariantId = (pathname: string): string | undefined => {
  const match = pathname.match(/^\/variants\/([^/]+)/);
  return match ? match[1] : undefined;
};

const extractTraitId = (pathname: string): string | undefined => {
  const match = pathname.match(/^\/traits\/([^/]+)/);
  return match ? match[1] : undefined;
};

export const CommunityNavigationSidebar: React.FC<
  CommunityNavigationSidebarProps
> = ({ className, onToggleToGlobal }) => {
  const location = useLocation();

  // Which community this is, straight off the hostname. No regex, no lookup,
  // and no window in which it is briefly unknown.
  const { community } = useCommunityHost();
  const communityId = community?.id;

  const speciesId = extractSpeciesId(location.pathname);
  const characterId = extractCharacterId(location.pathname);
  const variantId = extractVariantId(location.pathname);
  const traitId = extractTraitId(location.pathname);

  // These four exist only to name the species in the "Current species"
  // subsection. None of them decides which community this is any more, so a
  // slow or failed lookup costs a label, not the whole navigation.
  const { data: speciesData } = useSpeciesByIdQuery({
    variables: { id: speciesId || "" },
    skip: !speciesId,
  });

  const { data: characterData } = useGetCharacterQuery({
    variables: { id: characterId || "" },
    skip: !characterId,
  });

  const { data: variantData } = useSpeciesVariantByIdQuery({
    variables: { id: variantId || "" },
    skip: !variantId,
  });

  const { data: traitData } = useTraitByIdQuery({
    variables: { id: traitId || "" },
    skip: !traitId,
  });

  // The species in view, reached from whichever of the four the URL names.
  let contextSpeciesId: string | undefined = speciesId;
  let contextSpeciesName: string | undefined = speciesData?.speciesById?.name;

  if (characterId && characterData?.character?.species) {
    contextSpeciesId = characterData.character.species.id;
    contextSpeciesName = characterData.character.species.name;
  }

  if (variantId && variantData?.speciesVariantById?.species) {
    contextSpeciesId = variantData.speciesVariantById.species.id;
    contextSpeciesName = variantData.speciesVariantById.species.name;
  }

  if (traitId && traitData?.traitById?.species) {
    contextSpeciesId = traitData.traitById.species.id;
    contextSpeciesName = traitData.traitById.species.name;
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

  // Not a community host at all: nothing to show, hand back to the global one.
  // `Layout` normally decides this, but the sidebar can also be forced on by
  // the manual toggle, so it still has to be able to say no.
  if (!communityId) {
    return <GlobalNavigationSidebar onToggleToCommunity={undefined} />;
  }

  // Only membership gates the sidebar now. The species lookups above no longer
  // hold it up: they name a subsection, and it renders without them.
  if (loading) {
    return (
      <SidebarContainer
        className={className}
        role="navigation"
        aria-label="Community navigation"
      >
        <CommunityHeader>
          <LoadingContainer>Loading...</LoadingContainer>
        </CommunityHeader>
      </SidebarContainer>
    );
  }

  // Show error state if query failed
  if (error) {
    return (
      <SidebarContainer
        className={className}
        role="navigation"
        aria-label="Community navigation"
      >
        <CommunityHeader>
          <LoadingContainer style={{ color: "red" }}>
            Error loading community data
          </LoadingContainer>
        </CommunityHeader>
      </SidebarContainer>
    );
  }

  // Don't render if user is not a member
  if (!isMember) {
    return <GlobalNavigationSidebar onToggleToCommunity={undefined} />;
  }

  // The community is the host, so its pages are the root of it.
  const communityBasePath = "";

  return (
    <SidebarContainer
      className={className}
      role="navigation"
      aria-label="Community navigation"
    >
      <CommunityHeader>
        <CommunitySwitcher communityId={communityId} />
        {onToggleToGlobal && (
          <ToggleButton
            onClick={onToggleToGlobal}
            aria-label="View global navigation"
          >
            <Globe />
            View Global Navigation
          </ToggleButton>
        )}
        <SearchTrigger
          onClick={() => spotlight.open()}
          aria-label="Search pages"
        >
          <Search size={16} />
          Find page...
          <Kbd>{isMac ? "⌘K" : "Ctrl+K"}</Kbd>
        </SearchTrigger>
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
          <CommunityNavigationItem to="/" icon={BarChart3} label="Overview" />

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

            {/* Trades - the same inbox as the global one, narrowed to here.
                Offers are always made inside a community, so arriving from a
                community's sidebar and being shown everyone else's would be
                answering a question nobody asked. */}
            <CommunityNavigationItem
              to={`${communityBasePath}/trades`}
              icon={ArrowLeftRight}
              label="Trades"
              isNested
            />

            {/* Item Ledger - deliberately NOT under Administration. Provenance
                is readable by any member so it can act as a trust signal in
                trades; only the mutations that write it are gated. */}
            <CommunityNavigationItem
              to={`${communityBasePath}/items/ledger`}
              icon={ScrollText}
              label="Item Ledger"
              isNested
            />

            {/* Currencies - also not under Administration, and for the same
                reason. The supply table is readable by any member; only
                granting and removing are gated. */}
            <CommunityNavigationItem
              to={`${communityBasePath}/currencies`}
              icon={Coins}
              label="Currencies"
              isNested
            />

            {/* Any member can shop; what is for sale is configured under
                Administration. */}
            <CommunityNavigationItem
              to={`${communityBasePath}/shop`}
              icon={ShoppingCart}
              label="Shop"
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
                    <SubsectionLabel>
                      Current: {contextSpeciesName || "Loading..."}
                    </SubsectionLabel>
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
              {/* Dashboard - requires member management permissions */}
              {(permissions.canRemoveCommunityMember ||
                permissions.canManageMemberRoles) && (
                <CommunityNavigationItem
                  to={`${communityBasePath}/admin`}
                  icon={Shield}
                  label="Dashboard"
                  isNested
                />
              )}

              {/* Items - requires item management permissions */}
              {(permissions.canManageItems || permissions.canGrantItems) && (
                <CommunityNavigationItem
                  to={`${communityBasePath}/admin/shop`}
                  icon={Store}
                  label="Shop"
                  isNested
                />
              )}

              {/* Refunding past the buyer's own window is a grant-shaped
                  action, so it follows canGrantItems rather than the
                  permission for defining what is sold. */}
              {permissions.canGrantItems && (
                <CommunityNavigationItem
                  to={`${communityBasePath}/admin/shop/purchases`}
                  icon={Receipt}
                  label="Shop Purchases"
                  isNested
                />
              )}

              {hasAdminPermissions && (
                <CommunityNavigationItem
                  to={`${communityBasePath}/admin/items`}
                  icon={Package}
                  label="Items"
                  isNested
                />
              )}

              {/* Permissions - requires role management permissions */}
              {(permissions.canCreateRole || permissions.canEditRole) && (
                <CommunityNavigationItem
                  to={`${communityBasePath}/permissions`}
                  icon={Lock}
                  label="Permissions"
                  isNested
                />
              )}

              {/* Moderation index - shown to anyone who can work either
                  queue. The two queues stay listed below it: this is the
                  overview, not a replacement for the direct links. */}
              {(permissions.canModerateImages ||
                permissions.canEditCharacterRegistry) && (
                <CommunityNavigationItem
                  to={`${communityBasePath}/moderation`}
                  icon={ShieldCheck}
                  label="Moderation"
                  isNested
                />
              )}

              {/* Image Moderation - requires image moderation permissions */}
              {permissions.canModerateImages && (
                <CommunityNavigationItem
                  to={`${communityBasePath}/moderation/images`}
                  icon={Image}
                  label="Image Moderation"
                  isNested
                />
              )}

              {/* Trait Review - requires character registry permissions */}
              {permissions.canEditCharacterRegistry && (
                <CommunityNavigationItem
                  to={`${communityBasePath}/moderation/traits`}
                  icon={ClipboardCheck}
                  label="Trait Review"
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
