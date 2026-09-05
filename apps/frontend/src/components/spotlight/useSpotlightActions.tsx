import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type {
  SpotlightActionData,
  SpotlightActionGroupData,
} from "@mantine/spotlight";
import { useAuth } from "../../contexts/AuthContext";
import { useCommunityHost } from "../../contexts/CommunityHostContext";
import { useCommunityMembersByUserQuery } from "../../generated/graphql";
import { apexUrl } from "../../lib/communityHost";

export function useSpotlightActions(): SpotlightActionGroupData[] {
  const { user } = useAuth();
  const { slug: hostSlug, community: hostCommunity } = useCommunityHost();
  const hostCommunityId = hostCommunity?.id ?? null;
  const navigate = useNavigate();

  const { data: communitiesData } = useCommunityMembersByUserQuery({
    variables: { userId: user?.id || "", first: 50 },
    skip: !user?.id,
  });

  return useMemo(() => {
    const groups: SpotlightActionGroupData[] = [];

    const nav = (path: string) => () => navigate(path);

    /**
     * A whole-page navigation, for a destination on another host. The router
     * cannot cross an origin, so anything leaving this one has to go this way.
     */
    const leave = (url: string) => () => {
      window.location.assign(url);
    };

    /**
     * Something that lives at the apex: a route from here, a page load from a
     * community host.
     */
    const apex = (path: string) =>
      hostSlug ? leave(apexUrl(path)) : nav(path);

    /**
     * A page inside one of the viewer's communities.
     *
     * On that community's own host it is just a route. From anywhere else it
     * is another origin, reached through the apex's `/communities/:id`
     * forwarder -- `CommunityMembersByUser` gives us the community's id and
     * name but not the slug the host is built from.
     */
    const inCommunity = (communityId: string, path: string) =>
      communityId === hostCommunityId
        ? nav(path || "/")
        : leave(apexUrl(`/communities/${communityId}${path}`));

    // General — always visible
    groups.push({
      group: "General",
      actions: [
        {
          id: "home",
          label: "Home",
          description: "Go to the home page",
          // The site's home, not the community's -- `/` on a community host is
          // that community.
          onClick: apex("/"),
        },
        ...(user
          ? [
              {
                id: "dashboard",
                label: "Dashboard",
                description: "Your personal dashboard",
                onClick: apex("/dashboard"),
              },
              {
                id: "feed",
                label: "Feed",
                description: "Activity feed",
                onClick: apex("/feed"),
              },
            ]
          : []),
      ],
    });

    // Browse — always visible
    groups.push({
      group: "Browse",
      actions: [
        {
          id: "browse-characters",
          label: "Browse Characters",
          description: "View all characters",
          // Every character on the site, so the apex's `/characters`; the same
          // path on a community host is that community's roster.
          onClick: apex("/characters"),
        },
        {
          id: "browse-galleries",
          label: "Browse Galleries",
          description: "View all galleries",
          onClick: apex("/galleries"),
        },
        {
          id: "browse-media",
          label: "Browse Media",
          description: "View all media",
          onClick: apex("/media"),
        },
      ],
    });

    if (!user) return groups;

    // My Content
    groups.push({
      group: "My Content",
      actions: [
        {
          id: "my-characters",
          label: "My Characters",
          description: "Your characters",
          onClick: apex("/my/characters"),
        },
        {
          id: "my-galleries",
          label: "My Galleries",
          description: "Your galleries",
          onClick: apex("/my/galleries"),
        },
        {
          id: "my-media",
          label: "My Media",
          description: "Your media",
          onClick: apex("/my/media"),
        },
      ],
    });

    // Liked
    groups.push({
      group: "Liked",
      actions: [
        {
          id: "liked-characters",
          label: "Liked Characters",
          description: "Characters you liked",
          onClick: apex("/liked/characters"),
        },
        {
          id: "liked-galleries",
          label: "Liked Galleries",
          description: "Galleries you liked",
          onClick: apex("/liked/galleries"),
        },
        {
          id: "liked-media",
          label: "Liked Media",
          description: "Media you liked",
          onClick: apex("/liked/media"),
        },
      ],
    });

    // Create
    groups.push({
      group: "Create",
      actions: [
        // Only offered on a community host. A character is created inside a
        // community, so the apex has neither a route for it nor a community to
        // pick -- the way in from there is to open one first.
        ...(hostSlug
          ? [
              {
                id: "create-character",
                label: "Create Character",
                description: "Create a new character",
                onClick: nav("/character/create"),
              },
            ]
          : []),
        {
          id: "upload-media",
          label: "Upload Media",
          description: "Upload new media",
          onClick: apex("/upload"),
        },
        {
          id: "create-gallery",
          label: "Create Gallery",
          description: "Create a new gallery",
          onClick: apex("/gallery/create"),
        },
        {
          id: "create-text",
          label: "Create Text",
          description: "Create a new text post",
          onClick: apex("/text/create"),
        },
      ],
    });

    // Account
    groups.push({
      group: "Account",
      actions: [
        {
          id: "my-profile",
          label: "Edit Profile",
          description: "View and edit your profile",
          onClick: apex(`/user/${user.username}`),
        },
        {
          id: "my-communities",
          label: "My Communities",
          description: "View your communities",
          onClick: apex("/my/communities"),
        },
        {
          id: "join-community",
          label: "Join Community",
          description: "Join a new community",
          onClick: apex("/join-community"),
        },
      ],
    });

    // Site Admin
    if (user.isAdmin) {
      groups.push({
        group: "Site Admin",
        actions: [
          {
            id: "site-admin",
            label: "Site Admin",
            description: "Site administration panel",
            // The site's admin panel, so the apex's `/admin`. A community host
            // serves that same path as its own admin dashboard.
            onClick: apex("/admin"),
          },
          {
            id: "site-invite-codes",
            label: "Site Invite Codes",
            description: "Manage site-wide invite codes",
            onClick: apex("/admin/site-invite-codes"),
          },
          {
            id: "admin-communities",
            label: "Community Management",
            description: "Manage all communities",
            onClick: apex("/admin/communities"),
          },
        ],
      });
    }

    // Dynamic community groups
    const memberships = communitiesData?.communityMembersByUser?.nodes;
    if (memberships) {
      for (const membership of memberships) {
        const { role } = membership;
        const community = role.community;
        const cId = community.id;
        const cName = community.name;

        const hasAdminPermissions =
          role.canCreateRole ||
          role.canEditRole ||
          role.canRemoveCommunityMember ||
          role.canManageMemberRoles;

        const hasSpeciesPermissions =
          role.canCreateSpecies || role.canEditSpecies;

        const hasInvitePermissions =
          role.canCreateInviteCode || role.canListInviteCodes;

        // Annotated rather than inferred: without it the array's element type
        // is fixed by the first literal, which carries no `keywords`.
        const actions: SpotlightActionData[] = [
          {
            id: `c-${cId}-overview`,
            label: "Overview",
            description: `${cName} overview`,
            onClick: inCommunity(cId, ""),
          },
          {
            id: `c-${cId}-members`,
            label: "Members",
            description: `${cName} members`,
            onClick: inCommunity(cId, "/members"),
          },
          {
            id: `c-${cId}-inventory`,
            label: "Inventory",
            description: `${cName} inventory`,
            onClick: inCommunity(cId, "/inventory"),
          },
        ];

        if (hasInvitePermissions) {
          actions.push({
            id: `c-${cId}-invite-codes`,
            label: "Invite Codes",
            description: `${cName} invite codes`,
            onClick: inCommunity(cId, "/invite-codes"),
          });
        }

        if (hasAdminPermissions) {
          actions.push({
            id: `c-${cId}-settings`,
            label: "Settings",
            description: `${cName} settings`,
            onClick: inCommunity(cId, "/settings"),
          });
        }

        if (role.canRemoveCommunityMember || role.canManageMemberRoles) {
          actions.push(
            {
              id: `c-${cId}-admin`,
              label: "Admin Dashboard",
              description: `${cName} admin dashboard`,
              onClick: inCommunity(cId, "/admin"),
            },
            {
              id: `c-${cId}-colors`,
              label: "Color Palette",
              description: `${cName} color palette`,
              onClick: inCommunity(cId, "/admin/colors"),
            },
          );
        }

        if (role.canManageItems || role.canGrantItems) {
          actions.push({
            id: `c-${cId}-items`,
            label: "Items Admin",
            description: `${cName} items administration`,
            onClick: inCommunity(cId, "/admin/items"),
          });
        }

        if (hasSpeciesPermissions) {
          actions.push({
            id: `c-${cId}-species`,
            label: "Species Management",
            description: `${cName} species management`,
            onClick: inCommunity(cId, "/species"),
          });
        }

        if (role.canCreateRole || role.canEditRole) {
          actions.push({
            id: `c-${cId}-permissions`,
            label: "Permissions",
            description: `${cName} role permissions`,
            onClick: inCommunity(cId, "/permissions"),
          });
        }

        // Moderation. The vocabulary people reach for here is not the page
        // titles -- "pending", "queue", "approve", "reports" -- so these three
        // carry keywords, which Mantine's default filter searches alongside
        // the label and description.
        if (role.canModerateImages || role.canEditCharacterRegistry) {
          actions.push({
            id: `c-${cId}-moderation`,
            label: "Content Moderation",
            description: `${cName} moderation queues`,
            keywords: [
              "moderation",
              "moderate",
              "review",
              "queue",
              "pending",
              "approve",
              "reject",
              "reports",
              "reported",
              "flagged",
              "content",
            ],
            onClick: inCommunity(cId, "/moderation"),
          });
        }

        if (role.canModerateImages) {
          actions.push({
            id: `c-${cId}-image-moderation`,
            label: "Image Moderation",
            description: `${cName} image moderation`,
            keywords: [
              "images",
              "image",
              "artwork",
              "art",
              "uploads",
              "media",
              "nsfw",
              "approve",
              "reject",
              "pending",
              "queue",
              "moderation",
            ],
            onClick: inCommunity(cId, "/moderation/images"),
          });
        }

        if (role.canEditCharacterRegistry) {
          actions.push({
            id: `c-${cId}-trait-review`,
            label: "Trait Review",
            description: `${cName} trait review`,
            keywords: [
              "traits",
              "trait",
              "registry",
              "character",
              "approvals",
              "proposed",
              "changes",
              "pending",
              "queue",
              "moderation",
            ],
            onClick: inCommunity(cId, "/moderation/traits"),
          });
        }

        groups.push({ group: cName, actions });
      }
    }

    return groups;
  }, [user, communitiesData, navigate, hostSlug, hostCommunityId]);
}
