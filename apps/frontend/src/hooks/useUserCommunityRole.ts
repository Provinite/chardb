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

  // Debug logging
  console.log('[useUserCommunityRole] Debug Info:', {
    communityId,
    userId: user?.id,
    loading,
    hasError: !!error,
    error: error?.message,
    hasData: !!data,
    membershipCount: data?.communityMembersByUser?.nodes?.length || 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    memberships: data?.communityMembersByUser?.nodes?.map((m: any) => ({
      communityId: m.role.community.id,
      communityName: m.role.community.name,
      roleName: m.role.name,
    })),
  });

  const userRole = useMemo(() => {
    if (!data || !communityId) {
      console.log('[useUserCommunityRole] No data or communityId:', {
        hasData: !!data,
        communityId,
      });
      return null;
    }

    const membership = data.communityMembersByUser?.nodes?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m: any) => m.role.community.id === communityId,
    );

    console.log('[useUserCommunityRole] Membership lookup result:', {
      found: !!membership,
      communityId,
      roleName: membership?.role?.name,
    });

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
