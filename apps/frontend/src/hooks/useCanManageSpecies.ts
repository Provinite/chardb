import { useAuth } from "../contexts/AuthContext";
import { useCommunityId } from "../contexts/CommunityHostContext";
import { canEditSpecies, canManageSpecies } from "../lib/speciesAccess";
import { useUserCommunityRole } from "./useUserCommunityRole";

/** `canManageSpecies` for the viewer, in the given community. */
export const useCanManageSpecies = (communityId: string | undefined) => {
  const { user } = useAuth();
  const { userRole } = useUserCommunityRole(communityId);
  return canManageSpecies(userRole, Boolean(user?.isAdmin));
};

/**
 * `canEditSpecies` for the viewer, in the host's community. The species
 * pages only render for a species that belongs to it (`SpeciesScopeRoute`).
 */
export const useCanEditSpecies = () => {
  const { user } = useAuth();
  const { userRole } = useUserCommunityRole(useCommunityId() ?? undefined);
  return canEditSpecies(userRole, Boolean(user?.isAdmin));
};
