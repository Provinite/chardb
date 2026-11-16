import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { User } from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import {
  AllCommunityPermissions,
  CommunityPermission,
} from "../CommunityPermission";
import type { GlobalPermission } from "../GlobalPermission";
import {
  GRANTABLE_GLOBAL_PERMISSIONS,
  PermissionService,
  type AccessTokenGrant,
} from "../PermissionService";
import type { RequestPermissions } from "../request-permissions";
import {
  accessTokenSecretEnvironment,
  generateAccessTokenSecret,
  hashAccessTokenSecret,
} from "./access-token-secret";
import {
  accessTokenEnvironment,
  type AccessTokenEnvironment,
} from "./access-token-environment";

/** How long a new token may last, in days. */
export const ACCESS_TOKEN_LIFETIMES_DAYS = [7, 30, 90, 365] as const;

/** Community permissions a token may be granted. Membership is asked for apart. */
export const GRANTABLE_COMMUNITY_PERMISSIONS: readonly CommunityPermission[] =
  AllCommunityPermissions.filter(
    (permission) => permission !== CommunityPermission.Any,
  );

/** The global permissions `creator` may grant a token: those they hold. */
export const globalPermissionsGrantableBy = (
  creator: RequestPermissions,
): GlobalPermission[] =>
  GRANTABLE_GLOBAL_PERMISSIONS.filter((permission) =>
    creator.hasGlobal(permission),
  );

/** `lastUsedAt` is written at most this often, so use is not a write per request. */
const LAST_USED_RESOLUTION_MS = 60_000;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A request's personal access token is unknown, revoked or expired, or its
 * owner is no longer a site admin.
 */
export class InvalidAccessTokenError extends UnauthorizedException {
  constructor(message = "Access token is invalid, expired or revoked") {
    super(message);
  }
}

/**
 * A request's token names an environment other than this server's: a dev
 * token sent to production, say. Told apart because that is the mistake a
 * script's author actually makes.
 */
export class AccessTokenWrongEnvironmentError extends InvalidAccessTokenError {
  constructor() {
    super("This access token belongs to another environment");
  }
}

/** This server names no environment, so it makes no token. */
export class AccessTokensUnavailableError extends ServiceUnavailableException {
  constructor() {
    super("Access tokens are not set up on this server");
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
  /** `GlobalPermission` names, each one the creator holds. */
  globalPermissions?: string[];
}

/** A request authenticated with a token: who it acts as, and with what. */
export interface AuthenticatedAccessToken {
  tokenId: string;
  user: User;
  grants: AccessTokenGrant[];
  globalPermissions: string[];
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

  /** What this server mints and accepts; none makes and accepts no token. */
  private readonly environment: AccessTokenEnvironment | null;

  /** @throws UnknownAppEnvironmentError for an `APP_ENVIRONMENT` typo. */
  constructor(
    private readonly db: DatabaseService,
    private readonly permissionService: PermissionService,
    config: ConfigService,
  ) {
    this.environment = accessTokenEnvironment({
      APP_ENVIRONMENT: config.get<string>("APP_ENVIRONMENT"),
      NODE_ENV: config.get<string>("NODE_ENV"),
    });
  }

  /**
   * The owner and grants of the token with this secret.
   *
   * @throws AccessTokenWrongEnvironmentError for a secret that names another
   * environment.
   * @throws InvalidAccessTokenError for a secret that names no environment or
   * matches no token, a token that is revoked or expired, or one whose owner
   * is no longer a site admin.
   */
  async authenticate(secret: string): Promise<AuthenticatedAccessToken> {
    const environment = accessTokenSecretEnvironment(secret);
    if (!environment || !this.environment) throw new InvalidAccessTokenError();
    if (environment !== this.environment) {
      throw new AccessTokenWrongEnvironmentError();
    }

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
      globalPermissions: token.globalPermissions,
    };
  }

  /**
   * The secret is returned here and nowhere else.
   *
   * @param creator The permissions of the session minting the token: a global
   * permission is granted only if they hold it.
   */
  async create(
    ownerId: string,
    creator: RequestPermissions,
    request: CreateAccessTokenRequest,
  ) {
    const environment = this.environment;
    if (!environment) throw new AccessTokensUnavailableError();

    const name = request.name.trim();
    if (!name) throw new BadRequestException("Name a token");

    if (
      !(ACCESS_TOKEN_LIFETIMES_DAYS as readonly number[]).includes(
        request.expiresInDays,
      )
    ) {
      throw new BadRequestException("Unsupported token lifetime");
    }

    const globalPermissions = this.validateGlobalGrants(
      creator,
      request.globalPermissions ?? [],
    );
    if (request.communities.length === 0 && globalPermissions.length === 0) {
      throw new BadRequestException(
        "Grant a token at least one community or global permission",
      );
    }
    const grants = this.validateGrants(request.communities);
    const found = await this.db.community.count({
      where: { id: { in: grants.map((grant) => grant.communityId) } },
    });
    if (found !== grants.length) {
      throw new BadRequestException("A granted community does not exist");
    }

    const secret = generateAccessTokenSecret(environment);
    const token = await this.db.personalAccessToken.create({
      data: {
        userId: ownerId,
        name,
        tokenHash: hashAccessTokenSecret(secret),
        displayHint: secret.slice(-4),
        expiresAt: new Date(Date.now() + request.expiresInDays * DAY_MS),
        globalPermissions,
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

  /**
   * One token by id, whoever owns it, or null. Checks no ownership: pass only
   * an id the caller is entitled to, such as the request's own token.
   */
  get(tokenId: string) {
    return this.db.personalAccessToken.findUnique({
      where: { id: tokenId },
      include: withCommunities,
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

  private validateGlobalGrants(
    creator: RequestPermissions,
    requested: string[],
  ): GlobalPermission[] {
    const grantable = new Set<string>(globalPermissionsGrantableBy(creator));
    const permissions = [...new Set(requested)];
    for (const permission of permissions) {
      if (!grantable.has(permission)) {
        throw new BadRequestException(
          "A token may be granted only global permissions you hold",
        );
      }
    }
    return permissions as GlobalPermission[];
  }

  private validateGrants(
    requested: AccessTokenGrantRequest[],
  ): Array<{ communityId: string; permissions: string[] }> {
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
