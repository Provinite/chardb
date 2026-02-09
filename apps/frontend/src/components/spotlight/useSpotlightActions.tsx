import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SpotlightActionGroupData } from '@mantine/spotlight';
import { useAuth } from '../../contexts/AuthContext';
import { useCommunityMembersByUserQuery } from '../../generated/graphql';

export function useSpotlightActions(): SpotlightActionGroupData[] {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: communitiesData } = useCommunityMembersByUserQuery({
    variables: { userId: user?.id || '', first: 50 },
    skip: !user?.id,
  });

  return useMemo(() => {
    const groups: SpotlightActionGroupData[] = [];

    const nav = (path: string) => () => navigate(path);

    // General — always visible
    groups.push({
      group: 'General',
      actions: [
        { id: 'home', label: 'Home', description: 'Go to the home page', onClick: nav('/') },
        ...(user
          ? [
              { id: 'dashboard', label: 'Dashboard', description: 'Your personal dashboard', onClick: nav('/dashboard') },
              { id: 'feed', label: 'Feed', description: 'Activity feed', onClick: nav('/feed') },
            ]
          : []),
      ],
    });

    // Browse — always visible
    groups.push({
      group: 'Browse',
      actions: [
        { id: 'browse-characters', label: 'Browse Characters', description: 'View all characters', onClick: nav('/characters') },
        { id: 'browse-galleries', label: 'Browse Galleries', description: 'View all galleries', onClick: nav('/galleries') },
        { id: 'browse-media', label: 'Browse Media', description: 'View all media', onClick: nav('/media') },
      ],
    });

    if (!user) return groups;

    // My Content
    groups.push({
      group: 'My Content',
      actions: [
        { id: 'my-characters', label: 'My Characters', description: 'Your characters', onClick: nav('/my/characters') },
        { id: 'my-galleries', label: 'My Galleries', description: 'Your galleries', onClick: nav('/my/galleries') },
        { id: 'my-media', label: 'My Media', description: 'Your media', onClick: nav('/my/media') },
      ],
    });

    // Liked
    groups.push({
      group: 'Liked',
      actions: [
        { id: 'liked-characters', label: 'Liked Characters', description: 'Characters you liked', onClick: nav('/liked/characters') },
        { id: 'liked-galleries', label: 'Liked Galleries', description: 'Galleries you liked', onClick: nav('/liked/galleries') },
        { id: 'liked-media', label: 'Liked Media', description: 'Media you liked', onClick: nav('/liked/media') },
      ],
    });

    // Create
    groups.push({
      group: 'Create',
      actions: [
        { id: 'create-character', label: 'Create Character', description: 'Create a new character', onClick: nav('/character/create') },
        { id: 'upload-media', label: 'Upload Media', description: 'Upload new media', onClick: nav('/upload') },
        { id: 'create-gallery', label: 'Create Gallery', description: 'Create a new gallery', onClick: nav('/gallery/create') },
        { id: 'create-text', label: 'Create Text', description: 'Create a new text post', onClick: nav('/text/create') },
      ],
    });

    // Account
    groups.push({
      group: 'Account',
      actions: [
        { id: 'my-profile', label: 'Edit Profile', description: 'View and edit your profile', onClick: nav(`/user/${user.username}`) },
        { id: 'my-communities', label: 'My Communities', description: 'View your communities', onClick: nav('/my/communities') },
        { id: 'join-community', label: 'Join Community', description: 'Join a new community', onClick: nav('/join-community') },
      ],
    });

    // Site Admin
    if (user.isAdmin) {
      groups.push({
        group: 'Site Admin',
        actions: [
          { id: 'site-admin', label: 'Site Admin', description: 'Site administration panel', onClick: nav('/admin') },
          { id: 'site-invite-codes', label: 'Site Invite Codes', description: 'Manage site-wide invite codes', onClick: nav('/admin/site-invite-codes') },
          { id: 'admin-communities', label: 'Community Management', description: 'Manage all communities', onClick: nav('/admin/communities') },
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

        const actions = [
          { id: `c-${cId}-overview`, label: 'Overview', description: `${cName} overview`, onClick: nav(`/communities/${cId}`) },
          { id: `c-${cId}-members`, label: 'Members', description: `${cName} members`, onClick: nav(`/communities/${cId}/members`) },
          { id: `c-${cId}-inventory`, label: 'Inventory', description: `${cName} inventory`, onClick: nav(`/communities/${cId}/inventory`) },
        ];

        if (hasInvitePermissions) {
          actions.push({ id: `c-${cId}-invite-codes`, label: 'Invite Codes', description: `${cName} invite codes`, onClick: nav(`/communities/${cId}/invite-codes`) });
        }

        if (hasAdminPermissions) {
          actions.push(
            { id: `c-${cId}-settings`, label: 'Settings', description: `${cName} settings`, onClick: nav(`/communities/${cId}/settings`) },
            { id: `c-${cId}-admin`, label: 'Admin Dashboard', description: `${cName} admin dashboard`, onClick: nav(`/communities/${cId}/admin`) },
            { id: `c-${cId}-items`, label: 'Items Admin', description: `${cName} items administration`, onClick: nav(`/communities/${cId}/admin/items`) },
            { id: `c-${cId}-colors`, label: 'Color Palette', description: `${cName} color palette`, onClick: nav(`/communities/${cId}/admin/colors`) },
          );
        }

        if (hasSpeciesPermissions) {
          actions.push({ id: `c-${cId}-species`, label: 'Species Management', description: `${cName} species management`, onClick: nav(`/communities/${cId}/species`) });
        }

        if (role.canCreateRole || role.canEditRole) {
          actions.push({ id: `c-${cId}-permissions`, label: 'Permissions', description: `${cName} role permissions`, onClick: nav(`/communities/${cId}/permissions`) });
        }

        if (role.canModerateImages) {
          actions.push({ id: `c-${cId}-moderation`, label: 'Image Moderation Queue', description: `${cName} image moderation`, onClick: nav(`/communities/${cId}/moderation`) });
        }

        groups.push({ group: cName, actions });
      }
    }

    return groups;
  }, [user, communitiesData, navigate]);
}
