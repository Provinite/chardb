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

/** What a personal access token was granted in one community. */
export interface AccessTokenGrant {
  communityId: string;
  /** `CommunityPermission` names. A name the code no longer knows grants nothing. */
  permissions: readonly string[];
}

const knownCommunityPermissions = new Set<string>(AllCommunityPermissions);

/** One community's grant, read: membership asked for, and the rest. */
interface ReadGrant {
  member: boolean;
  permissions: Partial<Record<CommunityPermission, boolean>>;
}

/**
 * Global permissions a token may hold, in the order they are offered. Never
 * `canGrantGlobalPermissions`: a script hands out nothing site-wide. A
 * permission added to `GlobalPermission` is no token's until listed here.
 */
export const GRANTABLE_GLOBAL_PERMISSIONS: readonly GlobalPermission[] = [
  GlobalPermission.IsAdmin,
  GlobalPermission.CanCreateCommunity,
  GlobalPermission.CanListUsers,
  GlobalPermission.CanListInviteCodes,
  GlobalPermission.CanCreateInviteCode,
];

const grantableGlobalPermissions = new Set<string>(
  GRANTABLE_GLOBAL_PERMISSIONS,
);

/**
 * What a personal access token was granted. Each global permission it names
 * while its owner still holds it, and in each community it names, the
 * permissions it names there.
 *
 * Membership (`CommunityPermission.Any`) is a grant of its own, and counts
 * only where the owner really holds a role: a member-only handler acts on the
 * owner's own wallet and purchases there, and a non-member has none. Every
 * other permission is the grant alone, since a site admin may grant any of
 * them anywhere, and the owner is checked to still be a site admin before this
 * is built.
 */
class AccessTokenPermissions implements RequestPermissions {
  private readonly grants = new Map<string, ReadGrant>();
  private readonly global = new Set<GlobalPermission>();

  constructor(
    grants: readonly AccessTokenGrant[],
    /** `GlobalPermission` names. A name the code no longer knows grants nothing. */
    globalGrants: readonly string[],
    /** The owner's own account, asked which global permissions they hold and whether they are a member. */
    private readonly owner: RequestPermissions,
  ) {
    for (const name of globalGrants) {
      if (grantableGlobalPermissions.has(name)) {
        this.global.add(name as GlobalPermission);
      }
    }
    for (const grant of grants) {
      const read: ReadGrant = { member: false, permissions: {} };
      for (const name of grant.permissions) {
        if (!knownCommunityPermissions.has(name)) continue;
        if (name === CommunityPermission.Any) {
          read.member = true;
        } else {
          read.permissions[name as CommunityPermission] = true;
        }
      }
      this.grants.set(grant.communityId, read);
    }
  }

  get isAdmin(): boolean {
    return this.hasGlobal(GlobalPermission.IsAdmin);
  }

  /** Granted, and still held by the owner: taking it from them takes it from the token. */
  hasGlobal(permission: GlobalPermission): boolean {
    return this.global.has(permission) && this.owner.hasGlobal(permission);
  }

  async inCommunity(communityId: string): Promise<CommunityPermissions> {
    const grant = this.grants.get(communityId);
    if (!grant) return { hasMembership: false };
    return {
      ...grant.permissions,
      hasMembership: await this.holds(communityId, CommunityPermission.Any),
    };
  }

  hasInCommunity(
    communityId: string,
    permission: CommunityPermission,
  ): Promise<boolean> {
    return this.holds(communityId, permission);
  }

  async communityIdsWith(...anyOf: CommunityPermission[]): Promise<string[]> {
    const communityIds: string[] = [];
    for (const communityId of this.grants.keys()) {
      for (const permission of anyOf) {
        if (await this.holds(communityId, permission)) {
          communityIds.push(communityId);
          break;
        }
      }
    }
    return communityIds;
  }

  /** The one rule every question above asks. */
  private async holds(
    communityId: string,
    permission: CommunityPermission,
  ): Promise<boolean> {
    const grant = this.grants.get(communityId);
    if (!grant) return false;
    if (permission !== CommunityPermission.Any) {
      return grant.permissions[permission] === true;
    }
    if (!grant.member) return false;
    return (await this.owner.inCommunity(communityId)).hasMembership;
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

  /**
   * What a request made with a personal access token may do: its community
   * grants, membership only where `owner` is a member, and its global grants
   * only while `owner` holds them. The owner must already have been checked
   * to be a site admin.
   */
  forAccessToken(
    owner: PermissionHolder,
    grants: readonly AccessTokenGrant[],
    globalGrants: readonly string[],
  ): RequestPermissions {
    return new AccessTokenPermissions(
      grants,
      globalGrants,
      new AccountPermissions(owner, this.communityMembersService),
    );
  }

  /** Whether `userId` is the account being asked about. */
  isSelf(userId: string, targetUserId: string): boolean {
    return userId === targetUserId;
  }
}
