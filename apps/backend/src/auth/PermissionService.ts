import { Injectable } from "@nestjs/common";
import {
  AllCommunityPermissions,
  CommunityPermission,
} from "./CommunityPermission";
import { Role, User } from "@chardb/database";
import { CommunityMembersService } from "../community-members/community-members.service";
import { GlobalPermission } from "./GlobalPermission";
import {
  ANONYMOUS_PERMISSIONS,
  CommunityPermissions,
  RequestPermissions,
} from "./request-permissions";

/** The columns of an account that its permissions are read from. */
type PermissionHolder = Pick<User, "id" | `${GlobalPermission}`>;

/** Everything an account's own flags and community roles allow. */
class AccountPermissions implements RequestPermissions {
  private readonly communities = new Map<
    string,
    Promise<CommunityPermissions>
  >();
  private roles?: Promise<Role[]>;

  constructor(
    private readonly user: PermissionHolder,
    private readonly communityMembersService: CommunityMembersService,
  ) {}

  get isAdmin(): boolean {
    return this.hasGlobal(GlobalPermission.IsAdmin);
  }

  hasGlobal(permission: GlobalPermission): boolean {
    return this.user[permission] === true;
  }

  // Guards and fields run once per row of a list, and the rows of one list
  // nearly always share a community, so this turns a query per row into one.
  inCommunity(communityId: string): Promise<CommunityPermissions> {
    let permissions = this.communities.get(communityId);
    if (!permissions) {
      permissions = this.readCommunity(communityId);
      this.communities.set(communityId, permissions);
      // A read that failed is asked again, not remembered.
      permissions.catch(() => this.communities.delete(communityId));
    }
    return permissions;
  }

  async hasInCommunity(
    communityId: string,
    permission: CommunityPermission,
  ): Promise<boolean> {
    const permissions = await this.inCommunity(communityId);
    if (permission === CommunityPermission.Any) {
      return permissions.hasMembership;
    }
    return permissions[permission] === true;
  }

  async communityIdsWith(...anyOf: CommunityPermission[]): Promise<string[]> {
    // Every role the account holds anywhere, read once: a list query asks
    // this several times over, once per permission it filters by.
    if (!this.roles) {
      const roles = this.communityMembersService.getUserRoles(this.user.id);
      this.roles = roles;
      roles.catch(() => {
        if (this.roles === roles) this.roles = undefined;
      });
    }

    const communityIds = new Set<string>();
    for (const role of await this.roles) {
      const holdsOne = anyOf.some(
        (permission) =>
          permission === CommunityPermission.Any || role[permission] === true,
      );
      if (holdsOne) communityIds.add(role.communityId);
    }
    return [...communityIds];
  }

  /** The account's roles in the community, OR'd together. */
  private async readCommunity(
    communityId: string,
  ): Promise<CommunityPermissions> {
    const roles = await this.communityMembersService.getUserRolesInCommunity(
      this.user.id,
      communityId,
    );

    const permissions: CommunityPermissions = {
      hasMembership: roles.length > 0,
    };
    for (const role of roles) {
      for (const permission of AllCommunityPermissions) {
        // Membership, not a column on the role.
        if (permission === CommunityPermission.Any) continue;
        if (role[permission] === true) {
          permissions[permission] = true;
        }
      }
    }
    return permissions;
  }
}

/**
 * Builds the {@link RequestPermissions} a caller acts with.
 *
 * A request's are built once, when it is authenticated, and read back with
 * `@CurrentPermissions()` or `getPermissionsFromContext`.
 */
@Injectable()
export class PermissionService {
  constructor(
    private readonly communityMembersService: CommunityMembersService,
  ) {}

  /** Everything this account may do. Null is a caller who is not signed in. */
  forUser(user: PermissionHolder | null | undefined): RequestPermissions {
    if (!user) return ANONYMOUS_PERMISSIONS;
    return new AccountPermissions(user, this.communityMembersService);
  }

  /** Whether `userId` is the account being asked about. */
  isSelf(userId: string, targetUserId: string): boolean {
    return userId === targetUserId;
  }
}
