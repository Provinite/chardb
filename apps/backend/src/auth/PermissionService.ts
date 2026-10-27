import { Injectable } from "@nestjs/common";
import {
  AllCommunityPermissions,
  CommunityPermission,
} from "./CommunityPermission";
import { User } from "@chardb/database";
import { CommunityMembersService } from "../community-members/community-members.service";
import { GlobalPermission } from "./GlobalPermission";

/**
 * Service for checking user permissions.
 *
 * This service handles:
 * - Global permission checks
 * - Community permission checks
 * - Identity checks (self)
 */
export type CommunityPermissions = Awaited<
  ReturnType<PermissionService["getCommunityPermissions"]>
>;

@Injectable()
export class PermissionService {
  /** Per request: `${userId}:${communityId}` to that member's permissions. */
  private readonly byRequest = new WeakMap<
    object,
    Map<string, Promise<CommunityPermissions>>
  >();

  constructor(private communityMembersService: CommunityMembersService) {}

  /**
   * {@link getCommunityPermissions}, read once per request for each member and
   * community. Guards and fields run once per row of a list, and the rows of
   * one list nearly always share a community, so this turns a query per row
   * into one. A subscription has no request and reads every time.
   */
  getCommunityPermissionsForRequest(
    req: object | undefined,
    userId: string,
    communityId: string,
  ): Promise<CommunityPermissions> {
    if (!req) return this.getCommunityPermissions(userId, communityId);

    let cache = this.byRequest.get(req);
    if (!cache) {
      cache = new Map();
      this.byRequest.set(req, cache);
    }
    const key = `${userId}:${communityId}`;
    let permissions = cache.get(key);
    if (!permissions) {
      permissions = this.getCommunityPermissions(userId, communityId);
      cache.set(key, permissions);
    }
    return permissions;
  }

  /**
   * Get all community permissions for a user in a specific community.
   *
   * This method:
   * 1. Retrieves all roles the user has in the community
   * 2. Aggregates permissions across all roles using OR logic
   * 3. Returns a map of permissions the user has
   * 4. Includes `hasMembership` boolean indicating if user has any role
   *
   * @param userOrId - The user object or user ID
   * @param communityId - The ID of the community
   * @returns Object mapping permission names to boolean values (or undefined == false), plus hasMembership
   *
   * @example
   * ```typescript
   * const permissions = await permissionService.getCommunityPermissions(user, communityId);
   * if (permissions.hasMembership) {
   *   // User is a member of this community
   * }
   * if (permissions.canEditCharacter) {
   *   // User can edit characters in this community
   * }
   * ```
   */
  async getCommunityPermissions(
    userOrId: string | Pick<User, "id">,
    communityId: string,
  ) {
    const userId = typeof userOrId === "string" ? userOrId : userOrId.id;
    const roles = await this.communityMembersService.getUserRolesInCommunity(
      userId,
      communityId,
    );

    const permissions: Partial<Record<CommunityPermission, boolean>> & {
      hasMembership: boolean;
    } = {
      hasMembership: roles.length > 0,
    };

    for (const role of roles) {
      for (const permission of AllCommunityPermissions) {
        // Skip the sentinel value "Any" - it's not a real permission field
        if (permission === CommunityPermission.Any) {
          continue;
        }
        if (role[permission] === true) {
          permissions[permission] = true;
        }
      }
    }
    return permissions;
  }

  /**
   * Check if a user has a specific permission in a community.
   *
   * This is a convenience method that checks a single permission
   *
   * @param userOrId - The user object or user ID
   * @param communityId - The ID of the community
   * @param permission - The specific permission to check
   * @returns True if the user has the permission, false otherwise
   *
   * @example
   * ```typescript
   * const canEdit = await permissionService.hasCommunityPermission(
   *   user,
   *   communityId,
   *   CommunityPermission.CanEditCharacter
   * );
   * if (!canEdit) {
   *   throw new ForbiddenException('Cannot edit characters in this community');
   * }
   * ```
   */
  async hasCommunityPermission(
    userOrId: string | Pick<User, "id">,
    communityId: string,
    permission: CommunityPermission,
  ): Promise<boolean> {
    const res = await this.getCommunityPermissions(userOrId, communityId);
    return res[permission] === true;
  }

  /**
   * Check if a user has a specific global permission.
   *
   * Global permissions are system-wide and stored directly on the User entity.
   * Examples include: canCreateCommunity, canListUsers, isAdmin, etc.
   *
   * @param user - The user object
   * @param permission - The global permission to check
   * @returns True if the user has the permission, false otherwise
   *
   * @example
   * ```typescript
   * const canCreateCommunity = permissionService.hasGlobalPermission(
   *   user,
   *   GlobalPermission.CanCreateCommunity
   * );
   * if (!canCreateCommunity) {
   *   throw new ForbiddenException('Cannot create communities');
   * }
   * ```
   */
  hasGlobalPermission(user: User, permission: GlobalPermission): boolean {
    return user[permission] === true;
  }

  // ===== IDENTITY CHECKS =====

  /**
   * Check if a user ID matches a target user ID (identity check).
   *
   * @param userId - The user ID to check
   * @param targetUserId - The target user ID
   * @returns True if the IDs match, false otherwise
   *
   * @example
   * ```typescript
   * if (permissionService.isSelf(currentUser.id, requestedUserId)) {
   *   // User is accessing their own data
   * }
   * ```
   */
  isSelf(userId: string, targetUserId: string): boolean {
    return userId === targetUserId;
  }
}
