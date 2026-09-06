import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "@mantine/hooks";
import type {
  SpotlightActionData,
  SpotlightActionGroupData,
} from "@mantine/spotlight";
import { useAuth } from "../../contexts/AuthContext";
import { useCommunityHost } from "../../contexts/CommunityHostContext";
import { apexUrl, communityUrl } from "../../lib/communityHost";
import { useGetCommunityMembersQuery } from "../../generated/graphql";
import { drillQuery, parseSpotlightQuery } from "./spotlightQuery";

/** People matching what was typed. Picking one opens their pages. */
export const MEMBER_GROUP = "Members";

/** One person's pages, once you have picked them. */
export const MEMBER_PAGES_GROUP = "Member pages";

/** Enough to recognise the person you meant; more is a members list. */
const MEMBER_RESULT_LIMIT = 5;

/**
 * Which community the viewer is standing in, or undefined at the apex.
 *
 * Member search is scoped to it rather than fanned out across every community
 * the viewer belongs to: a name means a different person in each of them, and
 * one query per membership per keystroke is not a search box.
 *
 * The hostname answers this, not the pathname (#339) -- on a community host
 * every path is that community's, and `/communities/:id` no longer appears in
 * a URL at all.
 */
export function useActiveCommunityId(): string | undefined {
  const { community } = useCommunityHost();
  return community?.id;
}

export function useSpotlightActions(
  query: string,
  /** Rewrites the box, for the actions that narrow it rather than navigate. */
  setQuery: (query: string) => void,
): SpotlightActionGroupData[] {
  const { user } = useAuth();
  const { slug: hostSlug, community: hostCommunity } = useCommunityHost();
  const hostCommunityId = hostCommunity?.id ?? null;
  const navigate = useNavigate();
  const communityName = hostCommunity?.name ?? "this community";

  // Off the viewer: `me` already carries the memberships, and asking for them
  // separately could not start until `me` had returned the id to ask with.
  const communitiesData = user?.communityMemberships;

  // Every keystroke would otherwise be a round trip. 200ms is below the point
  // where the list feels like it is lagging the box.
  const [debouncedQuery] = useDebouncedValue(query.trim(), 200);
  // Memoised: it is a dependency of the actions below, and a fresh object
  // every render would rebuild the whole list on every render.
  const parsed = useMemo(
    () => parseSpotlightQuery(debouncedQuery),
    [debouncedQuery],
  );

  // Both people modes hit the same query. Once a person is picked it searches
  // for their name exactly, which the server sorts first -- so the same
  // request that listed the candidates also resolves the one you chose, and
  // Apollo serves the rest of the drill-down from cache while you type it.
  const memberSearch =
    parsed.mode === "people"
      ? parsed.term
      : parsed.mode === "person"
        ? parsed.username
        : "";

  const { data: memberData } = useGetCommunityMembersQuery({
    variables: {
      communityId: hostCommunityId ?? "",
      search: memberSearch || null,
      limit: MEMBER_RESULT_LIMIT,
    },
    skip: !user?.id || !hostCommunityId || parsed.mode === "pages",
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
     * is another origin, named directly -- the memberships on `me` carry the
     * slug, so there is no need for the apex's `/communities/:id` forwarder
     * and the two extra hops it costs.
     */
    const inCommunity = (slug: string, communityId: string, path: string) =>
      communityId === hostCommunityId
        ? nav(path || "/")
        : leave(communityUrl(slug, path || "/"));

    // `parsed.mode` again rather than trusting the skip: Apollo hands back the
    // last result for a skipped query, so without it the people you found stay
    // on screen after you have cleared the box.
    const members =
      parsed.mode === "pages" ? [] : (memberData?.community?.members ?? []);

    if (hostCommunityId && parsed.mode === "people" && members.length > 0) {
      groups.push({
        group: MEMBER_GROUP,
        actions: members.map((member) => ({
          id: `member-${member.id}`,
          label: member.displayName || member.username,
          description: `@${member.username}`,
          // Narrows the box instead of leaving it. Picking a person is half a
          // request -- the other half is which of their pages you wanted, and
          // asking it here beats loading one to navigate off it.
          onClick: () => setQuery(drillQuery(member.username)),
          closeSpotlightOnTrigger: false,
        })),
      });
    }

    if (hostCommunityId && parsed.mode === "person") {
      // The server sorts an exact name first, so this is the person named in
      // the query rather than whoever merely contains their spelling.
      const member = members.find(
        (m) => m.username.toLowerCase() === parsed.username.toLowerCase(),
      );
      // Member search only runs on a community host, so every path here is
      // already this community's -- a route, never a page load.
      const base = `/members/${parsed.username}`;

      if (member) {
        const who = member.displayName || member.username;
        const pages: SpotlightActionData[] = [
          {
            id: `member-page-profile-${member.id}`,
            label: "Profile",
            description: `${who} in ${communityName}`,
            onClick: nav(base),
          },
          {
            id: `member-page-inventory-${member.id}`,
            label: "Inventory",
            description: `What ${who} holds in ${communityName}`,
            onClick: nav(`${base}/inventory`),
          },
          {
            id: `member-page-characters-${member.id}`,
            label: "Characters",
            // Says "every" because it is the whole site rather than here --
            // the ones belonging to this community are on the profile above,
            // and the site-wide list lives at the apex.
            description: `Every character ${who} owns`,
            onClick: apex(`/user/${member.username}/characters`),
          },
        ];

        // Hidden on yourself: the server refuses a trade with yourself, so
        // offering it would be a dead end.
        if (member.id !== user?.id) {
          pages.push({
            id: `member-page-trade-${member.id}`,
            label: "Propose trade",
            description: `Open a trade with ${who}`,
            onClick: nav(`/trades/new?with=${member.id}`),
          });
        }

        groups.push({ group: MEMBER_PAGES_GROUP, actions: pages });
      }
    }

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
    const memberships = communitiesData?.nodes;
    if (memberships) {
      for (const membership of memberships) {
        const { role } = membership;
        const community = role.community;
        const cId = community.id;
        const cName = community.name;
        const cSlug = community.slug;

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
            onClick: inCommunity(cSlug, cId, ""),
          },
          {
            id: `c-${cId}-members`,
            label: "Members",
            description: `${cName} members`,
            onClick: inCommunity(cSlug, cId, "/members"),
          },
          {
            id: `c-${cId}-inventory`,
            label: "Inventory",
            description: `${cName} inventory`,
            onClick: inCommunity(cSlug, cId, "/inventory"),
          },
        ];

        if (hasInvitePermissions) {
          actions.push({
            id: `c-${cId}-invite-codes`,
            label: "Invite Codes",
            description: `${cName} invite codes`,
            onClick: inCommunity(cSlug, cId, "/invite-codes"),
          });
        }

        if (hasAdminPermissions) {
          actions.push({
            id: `c-${cId}-settings`,
            label: "Settings",
            description: `${cName} settings`,
            onClick: inCommunity(cSlug, cId, "/settings"),
          });
        }

        if (role.canRemoveCommunityMember || role.canManageMemberRoles) {
          actions.push(
            {
              id: `c-${cId}-admin`,
              label: "Admin Dashboard",
              description: `${cName} admin dashboard`,
              onClick: inCommunity(cSlug, cId, "/admin"),
            },
            {
              id: `c-${cId}-colors`,
              label: "Color Palette",
              description: `${cName} color palette`,
              onClick: inCommunity(cSlug, cId, "/admin/colors"),
            },
          );
        }

        if (role.canManageItems || role.canGrantItems) {
          actions.push({
            id: `c-${cId}-items`,
            label: "Items Admin",
            description: `${cName} items administration`,
            onClick: inCommunity(cSlug, cId, "/admin/items"),
          });
        }

        if (hasSpeciesPermissions) {
          actions.push({
            id: `c-${cId}-species`,
            label: "Species Management",
            description: `${cName} species management`,
            onClick: inCommunity(cSlug, cId, "/species"),
          });
        }

        if (role.canCreateRole || role.canEditRole) {
          actions.push({
            id: `c-${cId}-permissions`,
            label: "Permissions",
            description: `${cName} role permissions`,
            onClick: inCommunity(cSlug, cId, "/permissions"),
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
            onClick: inCommunity(cSlug, cId, "/moderation"),
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
            onClick: inCommunity(cSlug, cId, "/moderation/images"),
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
            onClick: inCommunity(cSlug, cId, "/moderation/traits"),
          });
        }

        groups.push({ group: cName, actions });
      }
    }

    return groups;
  }, [
    user,
    communitiesData,
    navigate,
    hostSlug,
    hostCommunityId,
    communityName,
    setQuery,
    memberData,
    parsed,
  ]);
}
