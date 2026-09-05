import React from "react";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import {
  User,
  Heart,
  Activity,
  ArrowLeftRight,
  LayoutGrid,
  Image,
  Users,
  Plus,
  Building2,
  Search,
} from "lucide-react";
import { spotlight } from "@mantine/spotlight";
import { CommunityNavigationItem } from "./CommunityNavigationItem";
import { CommunityNavigationGroup } from "./CommunityNavigationGroup";
import { useAuth } from "../../contexts/AuthContext";
import { useCommunityMembersByUserQuery } from "../../generated/graphql";
import { useCommunityHost } from "../../contexts/CommunityHostContext";
import { apexUrl } from "../../lib/communityHost";

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

const sidebarHeaderStyles = css`
  padding: ${({ theme }) => theme.spacing.md};
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

const SidebarHeader = styled(Link)`
  ${sidebarHeaderStyles}
`;

/** The same header when the dashboard is on another host; see `apexHref`. */
const SidebarHeaderAnchor = styled.a`
  ${sidebarHeaderStyles}
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

  @media (max-width: 768px) {
    display: none;
  }
`;

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform);

const LoadingContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-align: center;
`;

export const GlobalNavigationSidebar: React.FC<
  GlobalNavigationSidebarProps
> = ({ className, onToggleToCommunity }) => {
  const { user } = useAuth();
  const { slug: communitySlug } = useCommunityHost();

  /**
   * Every destination in this sidebar belongs to the apex -- including
   * `/trades` and `/characters`, which exist on both hosts but mean the
   * cross-community inbox and the global browse here.
   *
   * That normally needs no thought, because this is the apex's sidebar. But
   * `CommunityNavigationSidebar` falls back to rendering it on a community host
   * when the viewer is not a member, and from there the same paths are a
   * different origin. `CommunityNavigationItem` renders an absolute `to` as an
   * anchor for exactly this.
   */
  const apexHref = (path: string): string =>
    communitySlug ? apexUrl(path) : path;

  // Fetch user's communities
  const { data: communitiesData, loading: communitiesLoading } =
    useCommunityMembersByUserQuery({
      variables: { userId: user?.id || "", first: 50 },
      skip: !user?.id,
    });

  const communities =
    communitiesData?.communityMembersByUser?.nodes?.map(
      (m) => m.role.community,
    ) || [];

  return (
    <SidebarContainer
      className={className}
      role="navigation"
      aria-label="Global navigation"
    >
      {communitySlug ? (
        <SidebarHeaderAnchor href={apexUrl("/dashboard")}>
          <LayoutGrid size={20} />
          Dashboard
        </SidebarHeaderAnchor>
      ) : (
        <SidebarHeader to="/dashboard">
          <LayoutGrid size={20} />
          Dashboard
        </SidebarHeader>
      )}

      <SidebarContent>
        <SearchTrigger
          onClick={() => spotlight.open()}
          aria-label="Search pages"
        >
          <Search size={16} />
          Find page...
          <Kbd>{isMac ? "⌘K" : "Ctrl+K"}</Kbd>
        </SearchTrigger>

        {onToggleToCommunity && (
          <ToggleButton
            onClick={onToggleToCommunity}
            aria-label="View community navigation"
          >
            <Building2 />
            View Community Navigation
          </ToggleButton>
        )}

        {user && (
          <>
            {/* Personal Content Section */}
            <CommunityNavigationGroup
              title="My Content"
              icon={User}
              defaultExpanded
            >
              <CommunityNavigationItem
                to={apexHref("/my/characters")}
                icon={User}
                label="My Characters"
                isNested
              />
              <CommunityNavigationItem
                to={apexHref("/my/galleries")}
                icon={LayoutGrid}
                label="My Galleries"
                isNested
              />
              <CommunityNavigationItem
                to={apexHref("/my/media")}
                icon={Image}
                label="My Media"
                isNested
              />
            </CommunityNavigationGroup>

            <Divider />

            {/* Liked Content Section */}
            <CommunityNavigationGroup title="Liked" icon={Heart}>
              <CommunityNavigationItem
                to={apexHref("/liked/characters")}
                icon={User}
                label="Characters"
                isNested
              />
              <CommunityNavigationItem
                to={apexHref("/liked/galleries")}
                icon={LayoutGrid}
                label="Galleries"
                isNested
              />
              <CommunityNavigationItem
                to={apexHref("/liked/media")}
                icon={Image}
                label="Media"
                isNested
              />
            </CommunityNavigationGroup>

            <Divider />

            {/* Activity Section */}
            <CommunityNavigationItem
              to={apexHref("/feed")}
              icon={Activity}
              label="Activity Feed"
            />

            {/* Global rather than per-community: an offer waiting on you is
                waiting on you wherever it was made, and the whole point of one
                inbox is not having to remember which community to check. That
                is also why it is the apex's `/trades` and never the community
                host's, which is the same path meaning that community's offers. */}
            <CommunityNavigationItem
              to={apexHref("/trades")}
              icon={ArrowLeftRight}
              label="Trades"
            />

            <CommunityNavigationItem
              to={apexHref(`/user/${user.username}`)}
              icon={User}
              label="My Profile"
            />

            <Divider />
          </>
        )}

        {/* Browse Section */}
        <CommunityNavigationGroup title="Browse" icon={LayoutGrid}>
          {/* The global browse, so the apex's `/characters` -- a community
              host serves that path as its own roster. */}
          <CommunityNavigationItem
            to={apexHref("/characters")}
            icon={User}
            label="All Characters"
            isNested
          />
          <CommunityNavigationItem
            to={apexHref("/galleries")}
            icon={LayoutGrid}
            label="All Galleries"
            isNested
          />
          <CommunityNavigationItem
            to={apexHref("/media")}
            icon={Image}
            label="All Media"
            isNested
          />
        </CommunityNavigationGroup>

        <Divider />

        {/* Communities Section */}
        <CommunityNavigationGroup
          title="Communities"
          icon={Users}
          defaultExpanded
        >
          {user &&
            (communitiesLoading ? (
              <LoadingContainer>Loading communities...</LoadingContainer>
            ) : communities.length > 0 ? (
              <>
                {/* Every community is its own host, so these are absolute URLs
                    -- `CommunityNavigationItem` renders them as anchors. They
                    go via the apex's `/communities/:id` forwarder rather than
                    straight to `<slug>.chardb.cc` because
                    `CommunityMembersByUser` selects the community's id and name
                    but not its slug. */}
                {communities.map((community) => (
                  <CommunityNavigationItem
                    key={community.id}
                    to={apexUrl(`/communities/${community.id}`)}
                    icon={Users}
                    label={community.name}
                    isNested
                  />
                ))}
                <Divider />
                <CommunityNavigationItem
                  to={apexHref("/my/communities")}
                  icon={Users}
                  label="View All"
                  isNested
                />
              </>
            ) : (
              <LoadingContainer>No communities yet</LoadingContainer>
            ))}
          <CommunityNavigationItem
            to={apexHref("/join-community")}
            icon={Plus}
            label="Join Community"
            isNested
          />
        </CommunityNavigationGroup>
      </SidebarContent>
    </SidebarContainer>
  );
};
