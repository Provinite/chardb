import React from "react";
import { Outlet } from "react-router-dom";
import { useCommunityId } from "../contexts/CommunityHostContext";
import { useCanManageSpecies } from "../hooks/useCanManageSpecies";
import { AccessDenied } from "./AccessDenied";

/**
 * Layout route for the species, trait and variant management pages, which are
 * reachable by URL. Lets in anyone `canManageSpecies` allows; each page shows
 * only the controls their permissions cover. Sits inside `ProtectedRoute`, so
 * the viewer is signed in.
 */
export const SpeciesAdminRoute: React.FC = () => {
  const communityId = useCommunityId();
  const allowed = useCanManageSpecies(communityId ?? undefined);

  if (!allowed) {
    return (
      <AccessDenied>
        You don't have permission to manage species in this community.
      </AccessDenied>
    );
  }

  return <Outlet />;
};
