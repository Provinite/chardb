import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";

/**
 * Custom hook to get the user's role and permissions within a specific community
 */
export const useUserCommunityRole = (communityId: string | undefined) => {
  const { user } = useAuth();

  // Off `me`, not a query of its own. This used to ask
  // `communityMembersByUser(userId:)` -- which could not run until `me` had
  // told it the viewer's own id, so it was a second round trip waiting on the
  // first for data the first could have carried.
  // No loading or error of its own any more: the memberships arrive with the
  // viewer, so whether they are here is `AuthContext`'s question and a failure
  // to load them is a failure to load the session.
  const memberships = user?.communityMemberships?.nodes;
  const loading = false;

  const userRole = useMemo(() => {
    if (!memberships || !communityId) {
      return null;
    }

    const membership = memberships.find(
      (m) => m.role.community?.id === communityId,
    );

    return membership?.role || null;
  }, [memberships, communityId]);

  const community = useMemo(() => {
    return userRole?.community || null;
  }, [userRole]);

  const permissions = useMemo(() => {
    if (!userRole) {
      return {
        canCreateSpecies: false,
        canEditSpecies: false,
        canCreateCharacter: false,
        canEditCharacter: false,
        canEditOwnCharacter: false,
        canEditOwnCharacterRegistry: false,
        canEditCharacterRegistry: false,
        canCreateOrphanedCharacter: false,
        canCreateInviteCode: false,
        canListInviteCodes: false,
        canCreateRole: false,
        canEditRole: false,
        canRemoveCommunityMember: false,
        canManageMemberRoles: false,
        canManageItems: false,
        canGrantItems: false,
        canModerateImages: false,
        canDeleteCharacter: false,
      };
    }

    return {
      canCreateSpecies: userRole.canCreateSpecies,
      canEditSpecies: userRole.canEditSpecies,
      canCreateCharacter: userRole.canCreateCharacter,
      canEditCharacter: userRole.canEditCharacter,
      canEditOwnCharacter: userRole.canEditOwnCharacter,
      canEditOwnCharacterRegistry: userRole.canEditOwnCharacterRegistry,
      canEditCharacterRegistry: userRole.canEditCharacterRegistry,
      canCreateOrphanedCharacter: userRole.canCreateOrphanedCharacter,
      canCreateInviteCode: userRole.canCreateInviteCode,
      canListInviteCodes: userRole.canListInviteCodes,
      canCreateRole: userRole.canCreateRole,
      canEditRole: userRole.canEditRole,
      canRemoveCommunityMember: userRole.canRemoveCommunityMember,
      canManageMemberRoles: userRole.canManageMemberRoles,
      canManageItems: userRole.canManageItems,
      canGrantItems: userRole.canGrantItems,
      canModerateImages: userRole.canModerateImages,
      canDeleteCharacter: userRole.canDeleteCharacter,
    };
  }, [userRole]);

  /**
   * Check if the user has any admin permissions
   */
  const hasAdminPermissions = useMemo(() => {
    return (
      permissions.canCreateRole ||
      permissions.canEditRole ||
      permissions.canRemoveCommunityMember ||
      permissions.canManageMemberRoles ||
      permissions.canManageItems ||
      permissions.canGrantItems ||
      permissions.canModerateImages
    );
  }, [permissions]);

  /**
   * Check if the user has any species permissions
   */
  const hasSpeciesPermissions = useMemo(() => {
    return permissions.canCreateSpecies || permissions.canEditSpecies;
  }, [permissions]);

  /**
   * Check if the user has any invite permissions
   */
  const hasInvitePermissions = useMemo(() => {
    return permissions.canCreateInviteCode || permissions.canListInviteCodes;
  }, [permissions]);

  return {
    userRole,
    community,
    permissions,
    hasAdminPermissions,
    hasSpeciesPermissions,
    hasInvitePermissions,
    loading,
    isMember: !!userRole,
  };
};
