import { useMemo } from "react";
import { useHostCommunity } from "../contexts/CommunityHostContext";

/** Query variables that narrow a listing to one community. */
export interface HostCommunityScope {
  communityId?: string;
}

/**
 * Spread into a query's filters or variables to narrow it to the community
 * whose host this is. Empty at the apex, which shows everything.
 *
 * A community host is the whole site prefiltered to its community, so every
 * page served on both hosts goes through this rather than checking the host
 * itself.
 */
export const useHostCommunityScope = (): HostCommunityScope => {
  const communityId = useHostCommunity()?.id;
  return useMemo(() => (communityId ? { communityId } : {}), [communityId]);
};
