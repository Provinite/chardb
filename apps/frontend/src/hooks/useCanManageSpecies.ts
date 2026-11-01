import { useAuth } from "../contexts/AuthContext";
import { useUserCommunityRole } from "./useUserCommunityRole";

/**
 * Whether the viewer may use a community's species tooling: a role that can
 * create or edit species, or a site admin. The sidebar's Species & Characters
 * links use the same test.
 */
export const useCanManageSpecies = (communityId: string | undefined) => {
  const { user } = useAuth();
  const { hasSpeciesPermissions } = useUserCommunityRole(communityId);
  return Boolean(user?.isAdmin) || hasSpeciesPermissions;
};
