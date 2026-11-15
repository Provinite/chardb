import { CommunityPermission } from "./CommunityPermission";
import { GlobalPermission } from "./GlobalPermission";

/** One caller's permissions in one community. An absent flag is false. */
export type CommunityPermissions = Partial<
  Record<CommunityPermission, boolean>
> & {
  /** Holds at least one role in the community. */
  hasMembership: boolean;
};

/**
 * What the caller of one request may do.
 *
 * The one place a permission is read from. Guards, resolvers and services ask
 * this rather than the account's row or its roles, so whatever decides which
 * permissions a request carries decides it once, where this is built:
 * {@link PermissionService.forUser}.
 */
export interface RequestPermissions {
  /** Shorthand for `hasGlobal(GlobalPermission.IsAdmin)`. */
  readonly isAdmin: boolean;

  hasGlobal(permission: GlobalPermission): boolean;

  /** Read once per community for the life of this object. */
  inCommunity(communityId: string): Promise<CommunityPermissions>;

  /** `CommunityPermission.Any` asks for membership alone. */
  hasInCommunity(
    communityId: string,
    permission: CommunityPermission,
  ): Promise<boolean>;

  /**
   * The communities where the caller holds at least one of these. For a
   * query that filters rows by permission, where asking per community would
   * mean asking per row.
   */
  communityIdsWith(...anyOf: CommunityPermission[]): Promise<string[]>;
}

/** A caller who is not signed in. */
export const ANONYMOUS_PERMISSIONS: RequestPermissions = Object.freeze({
  isAdmin: false,
  hasGlobal: () => false,
  inCommunity: async () => ({ hasMembership: false }),
  hasInCommunity: async () => false,
  communityIdsWith: async () => [],
});

const byRequest = new WeakMap<object, RequestPermissions>();

/** Called once per request, by whatever authenticated it. */
export function setRequestPermissions(
  req: object,
  permissions: RequestPermissions,
): void {
  byRequest.set(req, permissions);
}

/**
 * A request has a user but was never told what it may do: something set
 * `req.user` without calling {@link setRequestPermissions}.
 */
export class MissingRequestPermissionsError extends Error {
  constructor() {
    super("Request has a user but no permissions");
    this.name = "MissingRequestPermissionsError";
  }
}

/**
 * The permissions `req` was authenticated with. A request with no user is
 * anonymous, and so is having no request at all.
 *
 * @throws MissingRequestPermissionsError for a request that has a user and
 * was given no permissions. Treating it as anonymous would refuse the caller
 * everything while `@CurrentUser()` still named them.
 */
export function getRequestPermissions(
  req: object | undefined | null,
): RequestPermissions {
  if (!req) return ANONYMOUS_PERMISSIONS;

  const permissions = byRequest.get(req);
  if (permissions) return permissions;

  if ((req as { user?: unknown }).user) {
    throw new MissingRequestPermissionsError();
  }
  return ANONYMOUS_PERMISSIONS;
}
