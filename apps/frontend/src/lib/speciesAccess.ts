import type { MeQuery } from "../generated/graphql";

type MembershipRole =
  MeQuery["me"]["communityMemberships"]["nodes"][number]["role"];

/**
 * Who may open a community's species, trait and variant management pages: a
 * role that can create or edit species, or a site admin. Each page then shows
 * only the controls the viewer's permissions allow.
 */
export const canManageSpecies = (
  role: Pick<MembershipRole, "canCreateSpecies" | "canEditSpecies"> | null,
  isAdmin: boolean,
): boolean =>
  isAdmin || Boolean(role?.canCreateSpecies || role?.canEditSpecies);

/**
 * Whether the viewer may change a species, its traits, their options and its
 * variants. Every write on the species management pages checks
 * `CanEditSpecies` or site admin on the server.
 */
export const canEditSpecies = (
  role: Pick<MembershipRole, "canEditSpecies"> | null,
  isAdmin: boolean,
): boolean => isAdmin || Boolean(role?.canEditSpecies);
