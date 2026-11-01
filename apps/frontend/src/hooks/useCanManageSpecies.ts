import { useAuth } from "../contexts/AuthContext";
import { canManageSpecies } from "../lib/speciesAccess";
import { useUserCommunityRole } from "./useUserCommunityRole";

/** `canManageSpecies` for the viewer, in the given community. */
export const useCanManageSpecies = (communityId: string | undefined) => {
  const { user } = useAuth();
  const { userRole } = useUserCommunityRole(communityId);
  return canManageSpecies(userRole, Boolean(user?.isAdmin));
};
