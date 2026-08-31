/**
 * Which paths put the app in community context.
 *
 * Shared because two callers need the same answer and used to hold their own
 * byte-identical copy: `Layout` decides whether the community sidebar mounts
 * at all, and `CommunityNavigationSidebar` decides whether to render itself or
 * hand back to the global one. Both must agree, and two copies of a predicate
 * that must agree is a fix waiting to be applied to only one of them.
 *
 * Some of these routes do not carry the community id in the path -- a species
 * or a character names its own -- so answering "is this community context" and
 * answering "which community" are separate jobs. This is only the first.
 */
const COMMUNITY_ROUTES = [
  /^\/communities\/[^/]+/,
  /^\/species\/[^/]+/,
  /^\/character\/[^/]+/,
  /^\/variants\/[^/]+/,
  /^\/traits\/[^/]+/,
  /^\/items\/[^/]+/,
];

export const isCommunityRoute = (pathname: string): boolean =>
  COMMUNITY_ROUTES.some((pattern) => pattern.test(pathname));
