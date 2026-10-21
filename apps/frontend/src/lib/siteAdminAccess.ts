import type { MeQuery } from "../generated/graphql";

/**
 * Who may open each site administration page (#405).
 *
 * Each mirrors what the page's own resolvers allow, so the UI never shows
 * someone a page the server would refuse them, and never hides one it would
 * serve. Being a site admin satisfies every one of them, as it does on the
 * server.
 */
type Viewer = Pick<
  MeQuery["me"],
  | "isAdmin"
  | "canCreateInviteCode"
  | "canListInviteCodes"
  | "canCreateCommunity"
>;

/** `/admin/site-invite-codes`: `invite-codes.resolver.ts`. */
export const canUseSiteInviteCodes = (viewer: Viewer): boolean =>
  viewer.isAdmin || viewer.canCreateInviteCode || viewer.canListInviteCodes;

/** `/admin/communities`: `createCommunity`, `updateCommunity`, `removeCommunity`. */
export const canManageCommunities = (viewer: Viewer): boolean =>
  viewer.isAdmin || viewer.canCreateCommunity;

/** `/admin`: the index, for anyone who can use at least one page under it. */
export const canUseSiteAdmin = (viewer: Viewer): boolean =>
  canUseSiteInviteCodes(viewer) || canManageCommunities(viewer);

/** Every other page under `/admin`: site admins only. */
export const isSiteAdmin = (viewer: Viewer): boolean => viewer.isAdmin;
