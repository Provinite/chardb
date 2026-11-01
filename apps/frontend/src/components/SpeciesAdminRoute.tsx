import React from "react";
import { Stack, Subtitle, Title } from "@chardb/ui";
import { useCommunityId } from "../contexts/CommunityHostContext";
import { useCanManageSpecies } from "../hooks/useCanManageSpecies";
import * as styles from "./SpeciesAdminRoute.css";

/**
 * Gates the species, trait and variant management pages, which are reachable
 * by URL. Sits inside `ProtectedRoute`, so the viewer is signed in. The
 * backend checks the specific permission on every write.
 */
export const SpeciesAdminRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const communityId = useCommunityId();
  const allowed = useCanManageSpecies(communityId ?? undefined);

  if (!allowed) {
    return (
      <Stack gap="sm" className={styles.denied}>
        <Title>Access Denied</Title>
        <Subtitle>
          You don't have permission to manage species in this community.
        </Subtitle>
      </Stack>
    );
  }

  return <>{children}</>;
};
