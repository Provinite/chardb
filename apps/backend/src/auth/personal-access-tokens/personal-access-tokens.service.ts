import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { User } from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import {
  AllCommunityPermissions,
  CommunityPermission,
} from "../CommunityPermission";
import { PermissionService, type AccessTokenGrant } from "../PermissionService";
import {
  generateAccessTokenSecret,
  hashAccessTokenSecret,
} from "./access-token-secret";

/** How long a new token may last, in days. */
export const ACCESS_TOKEN_LIFETIMES_DAYS = [7, 30, 90, 365] as const;

/** Community permissions a token may be granted. Membership is asked for apart. */
export const GRANTABLE_COMMUNITY_PERMISSIONS: readonly CommunityPermission[] =
  AllCommunityPermissions.filter(
    (permission) => permission !== CommunityPermission.Any,
  );

/** `lastUsedAt` is written at most this often, so use is not a write per request. */
const LAST_USED_RESOLUTION_MS = 60_000;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A request's personal access token is unknown, revoked or expired, or its
 * owner is no longer a site admin.
 */
export class InvalidAccessTokenError extends UnauthorizedException {
  constructor() {
    super("Access token is invalid, expired or revoked");
  }
}

export interface AccessTokenGrantRequest {
  communityId: string;
  member: boolean;
  permissions: string[];
}

export interface CreateAccessTokenRequest {
  name: string;
  expiresInDays: number;
  communities: AccessTokenGrantRequest[];
}

/** A request authenticated with a token: who it acts as, and with what. */
export interface AuthenticatedAccessToken {
  tokenId: string;
  user: User;
  grants: AccessTokenGrant[];
}

const withCommunities = {
  communities: {
    include: { community: { select: { id: true, name: true, slug: true } } },
    orderBy: { community: { name: "asc" as const } },
  },
};

@Injectable()
export class PersonalAccessTokensService {
  private readonly logger = new Logger(PersonalAccessTokensService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * The owner and grants of the token with this secret.
   *
   * @throws InvalidAccessTokenError for a secret that matches no token, or a
   * token that is revoked or expired, or whose owner is no longer a site
   * admin.
   */
  async authenticate(secret: string): Promise<AuthenticatedAccessToken> {
    const token = await this.db.personalAccessToken.findUnique({
      where: { tokenHash: hashAccessTokenSecret(secret) },
      include: { user: true, communities: true },
    });

    const now = new Date();
    if (
      !token ||
      token.revokedAt ||
      token.expiresAt <= now ||
      // The owner's own account, as a session of theirs would see it.
      !this.permissionService.forUser(token.user).isAdmin
    ) {
      throw new InvalidAccessTokenError();
    }

    this.recordUse(token.id, token.lastUsedAt, now);

    return {
      tokenId: token.id,
      user: token.user,
      grants: token.communities.map((grant) => ({
        communityId: grant.communityId,
        permissions: grant.permissions,
      })),
    };
  }

  /** The secret is returned here and nowhere else. */
  async create(ownerId: string, request: CreateAccessTokenRequest) {
    const name = request.name.trim();
    if (!name) throw new BadRequestException("Name a token");

    if (
      !(ACCESS_TOKEN_LIFETIMES_DAYS as readonly number[]).includes(
        request.expiresInDays,
      )
    ) {
      throw new BadRequestException("Unsupported token lifetime");
    }

    const grants = this.validateGrants(request.communities);
    const found = await this.db.community.count({
      where: { id: { in: grants.map((grant) => grant.communityId) } },
    });
    if (found !== grants.length) {
      throw new BadRequestException("A granted community does not exist");
    }

    const secret = generateAccessTokenSecret();
    const token = await this.db.personalAccessToken.create({
      data: {
        userId: ownerId,
        name,
        tokenHash: hashAccessTokenSecret(secret),
        displayHint: secret.slice(-4),
        expiresAt: new Date(Date.now() + request.expiresInDays * DAY_MS),
        communities: { create: grants },
      },
      include: withCommunities,
    });

    return { token, secret };
  }

  /** The owner's tokens, newest first, revoked and expired ones included. */
  list(ownerId: string) {
    return this.db.personalAccessToken.findMany({
      where: { userId: ownerId },
      include: withCommunities,
      orderBy: { createdAt: "desc" },
    });
  }

  /** Revoking a revoked token leaves its first revocation time. */
  async revoke(ownerId: string, tokenId: string) {
    const token = await this.db.personalAccessToken.findFirst({
      where: { id: tokenId, userId: ownerId },
    });
    if (!token) throw new NotFoundException("Access token not found");

    if (!token.revokedAt) {
      await this.db.personalAccessToken.update({
        where: { id: token.id },
        data: { revokedAt: new Date() },
      });
    }

    return this.db.personalAccessToken.findUniqueOrThrow({
      where: { id: token.id },
      include: withCommunities,
    });
  }

  /** Every community a token may name, by name. */
  grantableCommunities() {
    return this.db.community.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
  }

  private validateGrants(
    requested: AccessTokenGrantRequest[],
  ): Array<{ communityId: string; permissions: string[] }> {
    if (requested.length === 0) {
      throw new BadRequestException("Grant a token at least one community");
    }

    const seen = new Set<string>();
    return requested.map((grant) => {
      if (seen.has(grant.communityId)) {
        throw new BadRequestException("A community is granted twice");
      }
      seen.add(grant.communityId);

      const permissions = [...new Set(grant.permissions)];
      for (const permission of permissions) {
        if (
          !(GRANTABLE_COMMUNITY_PERMISSIONS as readonly string[]).includes(
            permission,
          )
        ) {
          throw new BadRequestException("Unknown community permission");
        }
      }
      if (!grant.member && permissions.length === 0) {
        throw new BadRequestException(
          "Grant a token something in each community it names",
        );
      }

      return {
        communityId: grant.communityId,
        permissions: grant.member
          ? [CommunityPermission.Any, ...permissions]
          : permissions,
      };
    });
  }

  /** Not awaited: a failed write here must not fail the request it came on. */
  private recordUse(tokenId: string, lastUsedAt: Date | null, now: Date) {
    if (
      lastUsedAt &&
      now.getTime() - lastUsedAt.getTime() < LAST_USED_RESOLUTION_MS
    ) {
      return;
    }
    this.db.personalAccessToken
      .update({ where: { id: tokenId }, data: { lastUsedAt: now } })
      .catch((err: unknown) => {
        this.logger.warn({
          message: "Failed to record access token use",
          tokenId,
          err,
        });
      });
  }
}
