import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDebouncedValue } from "@mantine/hooks";
import type {
  SpotlightActionData,
  SpotlightActionGroupData,
} from "@mantine/spotlight";
import { useAuth } from "../../contexts/AuthContext";
import {
  useCommunityMembersByUserQuery,
  useGetCommunityMembersQuery,
} from "../../generated/graphql";
import { drillQuery, parseSpotlightQuery } from "./spotlightQuery";

/** People matching what was typed. Picking one opens their pages. */
export const MEMBER_GROUP = "Members";

/** One person's pages, once you have picked them. */
export const MEMBER_PAGES_GROUP = "Member pages";

/** Enough to recognise the person you meant; more is a members list. */
const MEMBER_RESULT_LIMIT = 5;

/**
 * Which community the viewer is standing in, or undefined outside one.
 *
 * Member search is scoped to it rather than fanned out across every community
 * the viewer belongs to: a name means a different person in each of them, and
 * one query per membership per keystroke is not a search box.
 */
export function useActiveCommunityId(): string | undefined {
  const { pathname } = useLocation();
  return useMemo(
    () => /^\/communities\/([^/]+)/.exec(pathname)?.[1],
    [pathname],
  );
}

export function useSpotlightActions(
  query: string,
  /** Rewrites the box, for the actions that narrow it rather than navigate. */
  setQuery: (query: string) => void,
): SpotlightActionGroupData[] {
  const { user } = useAuth();
  const navigate = useNavigate();
  const activeCommunityId = useActiveCommunityId();

  const { data: communitiesData } = useCommunityMembersByUserQuery({
    variables: { userId: user?.id || "", first: 50 },
    skip: !user?.id,
  });

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
      communityId: activeCommunityId ?? "",
      search: memberSearch || null,
      limit: MEMBER_RESULT_LIMIT,
    },
    skip: !user?.id || !activeCommunityId || parsed.mode === "pages",
  });

  return useMemo(() => {
    const groups: SpotlightActionGroupData[] = [];

    const nav = (path: string) => () => navigate(path);

    // `parsed.mode` again rather than trusting the skip: Apollo hands back the
    // last result for a skipped query, so without it the people you found stay
    // on screen after you have cleared the box.
    const members =
      parsed.mode === "pages" ? [] : (memberData?.community?.members ?? []);
    const communityName =
      communitiesData?.communityMembersByUser?.nodes?.find(
        (m) => m.role.community.id === activeCommunityId,
      )?.role.community.name ?? "this community";

    if (activeCommunityId && parsed.mode === "people" && members.length > 0) {
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

    if (activeCommunityId && parsed.mode === "person") {
      // The server sorts an exact name first, so this is the person named in
      // the query rather than whoever merely contains their spelling.
      const member = members.find(
        (m) => m.username.toLowerCase() === parsed.username.toLowerCase(),
      );
      const base = `/communities/${activeCommunityId}/members/${parsed.username}`;

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
            // the ones belonging to this community are on the profile above.
            description: `Every character ${who} owns`,
            onClick: nav(`/user/${member.username}/characters`),
          },
        ];

        // Hidden on yourself: the server refuses a trade with yourself, so
        // offering it would be a dead end.
        if (member.id !== user?.id) {
          pages.push({
            id: `member-page-trade-${member.id}`,
            label: "Propose trade",
            description: `Open a trade with ${who}`,
            onClick: nav(
              `/communities/${activeCommunityId}/trades/new?with=${member.id}`,
            ),
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
          onClick: nav("/"),
        },
        ...(user
          ? [
              {
                id: "dashboard",
                label: "Dashboard",
                description: "Your personal dashboard",
                onClick: nav("/dashboard"),
              },
              {
                id: "feed",
                label: "Feed",
                description: "Activity feed",
                onClick: nav("/feed"),
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
          onClick: nav("/characters"),
        },
        {
          id: "browse-galleries",
          label: "Browse Galleries",
          description: "View all galleries",
          onClick: nav("/galleries"),
        },
        {
          id: "browse-media",
          label: "Browse Media",
          description: "View all media",
          onClick: nav("/media"),
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
          onClick: nav("/my/characters"),
        },
        {
          id: "my-galleries",
          label: "My Galleries",
          description: "Your galleries",
          onClick: nav("/my/galleries"),
        },
        {
          id: "my-media",
          label: "My Media",
          description: "Your media",
          onClick: nav("/my/media"),
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
          onClick: nav("/liked/characters"),
        },
        {
          id: "liked-galleries",
          label: "Liked Galleries",
          description: "Galleries you liked",
          onClick: nav("/liked/galleries"),
        },
        {
          id: "liked-media",
          label: "Liked Media",
          description: "Media you liked",
          onClick: nav("/liked/media"),
        },
      ],
    });

    // Create
    groups.push({
      group: "Create",
      actions: [
        {
          id: "create-character",
          label: "Create Character",
          description: "Create a new character",
          onClick: nav("/character/create"),
        },
        {
          id: "upload-media",
          label: "Upload Media",
          description: "Upload new media",
          onClick: nav("/upload"),
        },
        {
          id: "create-gallery",
          label: "Create Gallery",
          description: "Create a new gallery",
          onClick: nav("/gallery/create"),
        },
        {
          id: "create-text",
          label: "Create Text",
          description: "Create a new text post",
          onClick: nav("/text/create"),
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
          onClick: nav(`/user/${user.username}`),
        },
        {
          id: "my-communities",
          label: "My Communities",
          description: "View your communities",
          onClick: nav("/my/communities"),
        },
        {
          id: "join-community",
          label: "Join Community",
          description: "Join a new community",
          onClick: nav("/join-community"),
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
            onClick: nav("/admin"),
          },
          {
            id: "site-invite-codes",
            label: "Site Invite Codes",
            description: "Manage site-wide invite codes",
            onClick: nav("/admin/site-invite-codes"),
          },
          {
            id: "admin-communities",
            label: "Community Management",
            description: "Manage all communities",
            onClick: nav("/admin/communities"),
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
            onClick: nav(`/communities/${cId}`),
          },
          {
            id: `c-${cId}-members`,
            label: "Members",
            description: `${cName} members`,
            onClick: nav(`/communities/${cId}/members`),
          },
          {
            id: `c-${cId}-inventory`,
            label: "Inventory",
            description: `${cName} inventory`,
            onClick: nav(`/communities/${cId}/inventory`),
          },
        ];

        if (hasInvitePermissions) {
          actions.push({
            id: `c-${cId}-invite-codes`,
            label: "Invite Codes",
            description: `${cName} invite codes`,
            onClick: nav(`/communities/${cId}/invite-codes`),
          });
        }

        if (hasAdminPermissions) {
          actions.push({
            id: `c-${cId}-settings`,
            label: "Settings",
            description: `${cName} settings`,
            onClick: nav(`/communities/${cId}/settings`),
          });
        }

        if (role.canRemoveCommunityMember || role.canManageMemberRoles) {
          actions.push(
            {
              id: `c-${cId}-admin`,
              label: "Admin Dashboard",
              description: `${cName} admin dashboard`,
              onClick: nav(`/communities/${cId}/admin`),
            },
            {
              id: `c-${cId}-colors`,
              label: "Color Palette",
              description: `${cName} color palette`,
              onClick: nav(`/communities/${cId}/admin/colors`),
            },
          );
        }

        if (role.canManageItems || role.canGrantItems) {
          actions.push({
            id: `c-${cId}-items`,
            label: "Items Admin",
            description: `${cName} items administration`,
            onClick: nav(`/communities/${cId}/admin/items`),
          });
        }

        if (hasSpeciesPermissions) {
          actions.push({
            id: `c-${cId}-species`,
            label: "Species Management",
            description: `${cName} species management`,
            onClick: nav(`/communities/${cId}/species`),
          });
        }

        if (role.canCreateRole || role.canEditRole) {
          actions.push({
            id: `c-${cId}-permissions`,
            label: "Permissions",
            description: `${cName} role permissions`,
            onClick: nav(`/communities/${cId}/permissions`),
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
            onClick: nav(`/communities/${cId}/moderation`),
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
            onClick: nav(`/communities/${cId}/moderation/images`),
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
            onClick: nav(`/communities/${cId}/moderation/traits`),
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
    setQuery,
    memberData,
    parsed,
    activeCommunityId,
  ]);
}
