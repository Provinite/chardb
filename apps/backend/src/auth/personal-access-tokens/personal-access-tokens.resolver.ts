import { UseGuards } from "@nestjs/common";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AllowGlobalAdmin } from "../decorators/AllowGlobalAdmin";
import { RefuseAccessTokenGuard } from "../guards/RefuseAccessTokenGuard";
import {
  CurrentPermissions,
  type RequestPermissions,
} from "../decorators/CurrentPermissions";
import { CurrentUser } from "../decorators/CurrentUser";
import type { AuthenticatedCurrentUserType } from "../types/current-user.type";
import { CommunityPermission } from "../CommunityPermission";
import {
  ACCESS_TOKEN_LIFETIMES_DAYS,
  GRANTABLE_COMMUNITY_PERMISSIONS,
  globalPermissionsGrantableBy,
  PersonalAccessTokensService,
} from "./personal-access-tokens.service";
import {
  CreatedPersonalAccessToken,
  CreatePersonalAccessTokenInput,
  PersonalAccessToken,
  PersonalAccessTokenGrantOptions,
} from "./personal-access-token.dto";

type StoredToken = Awaited<
  ReturnType<PersonalAccessTokensService["list"]>
>[number];

/** A stored token as the API shows it: membership apart from permissions. */
export const toGraphql = (token: StoredToken): PersonalAccessToken => ({
  id: token.id,
  name: token.name,
  displayHint: token.displayHint,
  createdAt: token.createdAt,
  expiresAt: token.expiresAt,
  lastUsedAt: token.lastUsedAt,
  revokedAt: token.revokedAt,
  globalPermissions: token.globalPermissions,
  communities: token.communities.map((grant) => ({
    community: grant.community,
    member: grant.permissions.includes(CommunityPermission.Any),
    permissions: grant.permissions.filter(
      (permission) => permission !== CommunityPermission.Any,
    ),
  })),
});

/**
 * Site admins' personal access tokens. Every handler here is
 * `@AllowGlobalAdmin()`, and the class refuses every token request: a token
 * granted `isAdmin` still cannot list, mint or revoke tokens. A token reads
 * itself through `CurrentAccessTokenResolver` instead.
 */
@Resolver()
@UseGuards(RefuseAccessTokenGuard)
export class PersonalAccessTokensResolver {
  constructor(private readonly tokens: PersonalAccessTokensService) {}

  @AllowGlobalAdmin()
  @Query(() => [PersonalAccessToken], {
    description: "The caller's personal access tokens, newest first.",
  })
  async personalAccessTokens(
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<PersonalAccessToken[]> {
    return (await this.tokens.list(user.id)).map(toGraphql);
  }

  @AllowGlobalAdmin()
  @Query(() => PersonalAccessTokenGrantOptions, {
    description: "What a new personal access token may be granted.",
  })
  async personalAccessTokenGrantOptions(
    @CurrentPermissions() permissions: RequestPermissions,
  ): Promise<PersonalAccessTokenGrantOptions> {
    return {
      communities: await this.tokens.grantableCommunities(),
      permissions: [...GRANTABLE_COMMUNITY_PERMISSIONS],
      globalPermissions: globalPermissionsGrantableBy(permissions),
      lifetimesDays: [...ACCESS_TOKEN_LIFETIMES_DAYS],
    };
  }

  @AllowGlobalAdmin()
  @Mutation(() => CreatedPersonalAccessToken, {
    description:
      "Mints a personal access token for the caller. The secret is in this response and nowhere else.",
  })
  async createPersonalAccessToken(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @CurrentPermissions() permissions: RequestPermissions,
    @Args("input") input: CreatePersonalAccessTokenInput,
  ): Promise<CreatedPersonalAccessToken> {
    const { token, secret } = await this.tokens.create(
      user.id,
      permissions,
      input,
    );
    return { token: toGraphql(token), secret };
  }

  @AllowGlobalAdmin()
  @Mutation(() => PersonalAccessToken)
  async revokePersonalAccessToken(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("id", { type: () => ID }) id: string,
  ): Promise<PersonalAccessToken> {
    return toGraphql(await this.tokens.revoke(user.id, id));
  }
}
