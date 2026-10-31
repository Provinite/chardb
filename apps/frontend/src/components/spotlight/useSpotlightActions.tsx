import { useMemo } from "react";
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  CircleUser,
  ClipboardCheck,
  Dna,
  FilePlus,
  FolderOpen,
  FolderPlus,
  House,
  Image,
  LayoutGrid,
  Lock,
  Mail,
  Package,
  Palette,
  Plus,
  Settings,
  Shield,
  ShieldCheck,
  Upload,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { useDebouncedValue } from "@mantine/hooks";
import { useAuth } from "../../contexts/AuthContext";
import { useCommunityHost } from "../../contexts/CommunityHostContext";
import { apexUrl, communityUrl } from "../../lib/communityHost";
import { useGetCommunityMembersQuery } from "../../generated/graphql";
import { drillQuery, parseSpotlightQuery } from "./spotlightQuery";
import type { SpotlightGroup, SpotlightItem } from "./types";

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

export interface SpotlightActions {
  groups: SpotlightGroup[];
  /** Member results for what has been typed are still on their way. */
  pending: boolean;
}

export function useSpotlightActions(
  query: string,
  /** Rewrites the box, for the actions that narrow it rather than navigate. */
  setQuery: (query: string) => void,
): SpotlightActions {
  const { user } = useAuth();
  const { slug: hostSlug, community: hostCommunity } = useCommunityHost();
  const hostCommunityId = hostCommunity?.id ?? null;
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

  const skipMembers = !user?.id || !hostCommunityId || parsed.mode === "pages";
  const { data: memberData, loading: membersLoading } =
    useGetCommunityMembersQuery({
      variables: {
        communityId: hostCommunityId ?? "",
        search: memberSearch || null,
        limit: MEMBER_RESULT_LIMIT,
      },
      skip: skipMembers,
    });

  // A people query typed but not yet answered: still inside the debounce, or
  // on the network. The box has changed mode; the members have not arrived.
  const pending =
    !!hostCommunityId &&
    parseSpotlightQuery(query).mode !== "pages" &&
    (query.trim() !== debouncedQuery || (!skipMembers && membersLoading));

  const groups = useMemo(() => {
    const groups: SpotlightGroup[] = [];

    // Destinations are URLs, and whoever renders them decides how to get
    // there: a route on this host, a page load on another.

    /** A page on this host. */
    const nav = (path: string) => path;

    /** Something that lives at the apex: a path from here, a URL from a community host. */
    const apex = (path: string) => (hostSlug ? apexUrl(path) : path);

    /**
     * A page inside one of the viewer's communities.
     *
     * On that community's own host it is just a path. From anywhere else it
     * is another origin, named directly -- the memberships on `me` carry the
     * slug, so there is no need for the apex's `/communities/:id` forwarder
     * and the two extra hops it costs.
     */
    const inCommunity = (slug: string, communityId: string, path: string) =>
      communityId === hostCommunityId
        ? path || "/"
        : communityUrl(slug, path || "/");

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
          icon: CircleUser,
          label: member.displayName || member.username,
          description: `@${member.username}`,
          // Narrows the box instead of leaving it. Picking a person is half a
          // request -- the other half is which of their pages you wanted, and
          // asking it here beats loading one to navigate off it.
          onSelect: () => setQuery(drillQuery(member.username)),
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
        const pages: SpotlightItem[] = [
          {
            id: `member-page-profile-${member.id}`,
            icon: User,
            label: "Profile",
            description: `${who} in ${communityName}`,
            to: nav(base),
          },
          {
            id: `member-page-inventory-${member.id}`,
            icon: Package,
            label: "Inventory",
            description: `What ${who} holds in ${communityName}`,
            to: nav(`${base}/inventory`),
          },
          {
            id: `member-page-characters-${member.id}`,
            icon: FolderOpen,
            label: "Characters",
            // Says "every" because it is the whole site rather than here --
            // the ones belonging to this community are on the profile above,
            // and the site-wide list lives at the apex.
            description: `Every character ${who} owns`,
            to: apex(`/user/${member.username}/characters`),
          },
        ];

        // Hidden on yourself: the server refuses a trade with yourself, so
        // offering it would be a dead end.
        if (member.id !== user?.id) {
          pages.push({
            id: `member-page-trade-${member.id}`,
            icon: ArrowLeftRight,
            label: "Propose trade",
            description: `Open a trade with ${who}`,
            to: nav(`/trades/new?with=${member.id}`),
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
          icon: House,
          label: "Home",
          description: "Go to the home page",
          // The site's home, not the community's -- `/` on a community host is
          // that community.
          to: apex("/"),
        },
        ...(user
          ? [
              {
                id: "dashboard",
                icon: LayoutGrid,
                label: "Dashboard",
                description: "Your personal dashboard",
                to: apex("/dashboard"),
              },
              {
                id: "feed",
                icon: Activity,
                label: "Feed",
                description: "Activity feed",
                to: apex("/feed"),
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
          icon: User,
          label: "Browse Characters",
          description: "View all characters",
          // Every character on the site, so the apex's `/characters`; the same
          // path on a community host is that community's roster.
          to: apex("/characters"),
        },
        {
          id: "browse-galleries",
          icon: LayoutGrid,
          label: "Browse Galleries",
          description: "View all galleries",
          to: apex("/galleries"),
        },
        {
          id: "browse-media",
          icon: Image,
          label: "Browse Media",
          description: "View all media",
          to: apex("/media"),
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
          icon: User,
          label: "My Characters",
          description: "Your characters",
          to: apex("/my/characters"),
        },
        {
          id: "my-galleries",
          icon: LayoutGrid,
          label: "My Galleries",
          description: "Your galleries",
          to: apex("/my/galleries"),
        },
        {
          id: "my-media",
          icon: Image,
          label: "My Media",
          description: "Your media",
          to: apex("/my/media"),
        },
      ],
    });

    // Liked
    groups.push({
      group: "Liked",
      actions: [
        {
          id: "liked-characters",
          icon: User,
          label: "Liked Characters",
          description: "Characters you liked",
          to: apex("/liked/characters"),
        },
        {
          id: "liked-galleries",
          icon: LayoutGrid,
          label: "Liked Galleries",
          description: "Galleries you liked",
          to: apex("/liked/galleries"),
        },
        {
          id: "liked-media",
          icon: Image,
          label: "Liked Media",
          description: "Media you liked",
          to: apex("/liked/media"),
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
                icon: UserPlus,
                label: "Create Character",
                description: "Create a new character",
                to: nav("/character/create"),
              },
            ]
          : []),
        {
          id: "upload-media",
          icon: Upload,
          label: "Upload Media",
          // `nav`, not `apex`: uploading stays on the host it was started
          // from, because that host is what decides which community's
          // moderators review the result.
          description: hostSlug
            ? `Upload new media, reviewed by ${communityName}`
            : "Upload new media",
          to: nav("/upload"),
        },
        {
          id: "create-gallery",
          icon: FolderPlus,
          label: "Create Gallery",
          description: "Create a new gallery",
          to: apex("/gallery/create"),
        },
        {
          id: "create-text",
          icon: FilePlus,
          label: "Create Text",
          // Stays on-host for the same reason as Upload Media above.
          description: "Create a new text post",
          to: nav("/text/create"),
        },
      ],
    });

    // Account
    groups.push({
      group: "Account",
      actions: [
        {
          id: "my-profile",
          icon: User,
          label: "Edit Profile",
          description: "View and edit your profile",
          to: apex(`/user/${user.username}`),
        },
        {
          id: "my-communities",
          icon: Users,
          label: "My Communities",
          description: "View your communities",
          to: apex("/my/communities"),
        },
        {
          id: "join-community",
          icon: Plus,
          label: "Join Community",
          description: "Join a new community",
          to: apex("/join-community"),
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
            icon: Shield,
            label: "Site Admin",
            description: "Site administration panel",
            // The site's admin panel, so the apex's `/admin`. A community host
            // serves that same path as its own admin dashboard.
            to: apex("/admin"),
          },
          {
            id: "site-invite-codes",
            icon: Mail,
            label: "Site Invite Codes",
            description: "Manage site-wide invite codes",
            to: apex("/admin/site-invite-codes"),
          },
          {
            id: "admin-communities",
            icon: Users,
            label: "Community Management",
            description: "Manage all communities",
            to: apex("/admin/communities"),
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
        const actions: SpotlightItem[] = [
          {
            id: `c-${cId}-overview`,
            icon: BarChart3,
            label: "Overview",
            description: `${cName} overview`,
            to: inCommunity(cSlug, cId, ""),
          },
          // Characters, for every member. The spotlight had no character page
          // for a community at all -- not this one and not the browse -- so
          // the answer to "where are my Cloverse characters" could not be
          // typed any more than it could be clicked (#338).
          {
            id: `c-${cId}-characters`,
            icon: User,
            label: "Browse Characters",
            description: `${cName} characters`,
            to: inCommunity(cSlug, cId, "/characters"),
          },
          {
            id: `c-${cId}-my-characters`,
            icon: FolderOpen,
            label: "My Characters",
            description: `Your characters in ${cName}`,
            to: inCommunity(cSlug, cId, "/my-characters"),
          },
          {
            id: `c-${cId}-members`,
            icon: Users,
            label: "Members",
            description: `${cName} members`,
            to: inCommunity(cSlug, cId, "/members"),
          },
          {
            id: `c-${cId}-inventory`,
            icon: Package,
            label: "Inventory",
            description: `${cName} inventory`,
            to: inCommunity(cSlug, cId, "/inventory"),
          },
        ];

        if (hasInvitePermissions) {
          actions.push({
            id: `c-${cId}-invite-codes`,
            icon: Mail,
            label: "Invite Codes",
            description: `${cName} invite codes`,
            to: inCommunity(cSlug, cId, "/invite-codes"),
          });
        }

        if (hasAdminPermissions) {
          actions.push({
            id: `c-${cId}-settings`,
            icon: Settings,
            label: "Settings",
            description: `${cName} settings`,
            to: inCommunity(cSlug, cId, "/settings"),
          });
        }

        if (role.canRemoveCommunityMember || role.canManageMemberRoles) {
          actions.push(
            {
              id: `c-${cId}-admin`,
              icon: Shield,
              label: "Admin Dashboard",
              description: `${cName} admin dashboard`,
              to: inCommunity(cSlug, cId, "/admin"),
            },
            {
              id: `c-${cId}-colors`,
              icon: Palette,
              label: "Color Palette",
              description: `${cName} color palette`,
              to: inCommunity(cSlug, cId, "/admin/colors"),
            },
          );
        }

        if (role.canManageItems || role.canGrantItems) {
          actions.push({
            id: `c-${cId}-items`,
            icon: Package,
            label: "Items Admin",
            description: `${cName} items administration`,
            to: inCommunity(cSlug, cId, "/admin/items"),
          });
        }

        if (hasSpeciesPermissions) {
          actions.push({
            id: `c-${cId}-species`,
            icon: Dna,
            label: "Species Management",
            description: `${cName} species management`,
            to: inCommunity(cSlug, cId, "/species"),
          });
        }

        if (role.canCreateRole || role.canEditRole) {
          actions.push({
            id: `c-${cId}-permissions`,
            icon: Lock,
            label: "Permissions",
            description: `${cName} role permissions`,
            to: inCommunity(cSlug, cId, "/permissions"),
          });
        }

        // Moderation. The vocabulary people reach for here is not the page
        // titles -- "pending", "queue", "approve", "reports" -- so these three
        // carry keywords, which the filter searches alongside the label and
        // description.
        if (role.canModerateImages || role.canEditCharacterRegistry) {
          actions.push({
            id: `c-${cId}-moderation`,
            icon: ShieldCheck,
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
            to: inCommunity(cSlug, cId, "/moderation"),
          });
        }

        if (role.canModerateImages) {
          actions.push({
            id: `c-${cId}-image-moderation`,
            icon: Image,
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
            to: inCommunity(cSlug, cId, "/moderation/images"),
          });
        }

        if (role.canEditCharacterRegistry) {
          actions.push({
            id: `c-${cId}-trait-review`,
            icon: ClipboardCheck,
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
            to: inCommunity(cSlug, cId, "/moderation/traits"),
          });
        }

        groups.push({ group: cName, actions });
      }
    }

    return groups;
  }, [
    user,
    communitiesData,
    hostSlug,
    hostCommunityId,
    communityName,
    setQuery,
    memberData,
    parsed,
  ]);

  return { groups, pending };
}
