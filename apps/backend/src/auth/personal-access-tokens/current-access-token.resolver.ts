import { Context, Query, Resolver } from "@nestjs/graphql";
import type { Request } from "express";
import { getRequestAccessTokenId } from "../access-token-request";
import { AllowAccessToken } from "../decorators/AllowAccessToken";
import { AllowAnyAuthenticated } from "../decorators/AllowAnyAuthenticated";
import {
  CurrentPermissions,
  type RequestPermissions,
} from "../decorators/CurrentPermissions";
import type { GlobalPermission } from "../GlobalPermission";
import { PersonalAccessToken } from "./personal-access-token.dto";
import { PersonalAccessTokensService } from "./personal-access-tokens.service";
import { toGraphql } from "./personal-access-tokens.resolver";

/**
 * A token reading itself, so a script can see what it may do before it is
 * refused. Apart from `PersonalAccessTokensResolver`, which no token may
 * reach.
 */
@Resolver()
export class CurrentAccessTokenResolver {
  constructor(private readonly tokens: PersonalAccessTokensService) {}

  @AllowAnyAuthenticated()
  @AllowAccessToken()
  @Query(() => PersonalAccessToken, {
    nullable: true,
    description:
      "The personal access token this request was made with, and what it may do. Null for a session.",
  })
  async currentAccessToken(
    @Context() ctx: { req: Request },
    @CurrentPermissions() permissions: RequestPermissions,
  ): Promise<PersonalAccessToken | null> {
    const tokenId = getRequestAccessTokenId(ctx.req);
    if (!tokenId) return null;
    const token = await this.tokens.get(tokenId);
    if (!token) return null;
    const shown = toGraphql(token);
    // What it may do now: a grant its owner has since lost counts for nothing.
    shown.globalPermissions = shown.globalPermissions.filter((name) =>
      permissions.hasGlobal(name as GlobalPermission),
    );
    return shown;
  }
}
