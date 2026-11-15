import { Context, Query, Resolver } from "@nestjs/graphql";
import type { Request } from "express";
import { getRequestAccessTokenId } from "../access-token-request";
import { AllowAccessToken } from "../decorators/AllowAccessToken";
import { AllowAnyAuthenticated } from "../decorators/AllowAnyAuthenticated";
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
  ): Promise<PersonalAccessToken | null> {
    const tokenId = getRequestAccessTokenId(ctx.req);
    if (!tokenId) return null;
    return toGraphql(await this.tokens.get(tokenId));
  }
}
