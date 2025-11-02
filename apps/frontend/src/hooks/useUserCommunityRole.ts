import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCommunityMembersByUserQuery } from '../generated/graphql';

/**
 * Custom hook to get the user's role and permissions within a specific community
 */
export const useUserCommunityRole = (communityId: string | undefined) => {
  const { user } = useAuth();

  const { data, loading, error } = useCommunityMembersByUserQuery({
    variables: { userId: user?.id || '', first: 50 },
    skip: !user?.id,
  });

  const userRole = useMemo(() => {
    if (!data || !communityId) {
      return null;
    }

    const membership = data.communityMembersByUser?.nodes?.find(
      (m: any) => m.role.community.id === communityId
    );

    return membership?.role || null;
  }, [data, communityId]);

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
        canCreateOrphanedCharacter: false,
        canCreateInviteCode: false,
        canListInviteCodes: false,
        canCreateRole: false,
        canEditRole: false,
        canRemoveCommunityMember: false,
        canManageMemberRoles: false,
      };
    }

    return {
      canCreateSpecies: userRole.canCreateSpecies,
      canEditSpecies: userRole.canEditSpecies,
      canCreateCharacter: userRole.canCreateCharacter,
      canEditCharacter: userRole.canEditCharacter,
      canEditOwnCharacter: userRole.canEditOwnCharacter,
      canCreateOrphanedCharacter: userRole.canCreateOrphanedCharacter,
      canCreateInviteCode: userRole.canCreateInviteCode,
      canListInviteCodes: userRole.canListInviteCodes,
      canCreateRole: userRole.canCreateRole,
      canEditRole: userRole.canEditRole,
      canRemoveCommunityMember: userRole.canRemoveCommunityMember,
      canManageMemberRoles: userRole.canManageMemberRoles,
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
      permissions.canManageMemberRoles
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
    error,
    isMember: !!userRole,
  };
};
