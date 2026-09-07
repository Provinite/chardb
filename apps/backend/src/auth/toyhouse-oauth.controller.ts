import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import { AllowUnauthenticated } from "./decorators/AllowUnauthenticated";
import { AllowAnyAuthenticated } from "./decorators/AllowAnyAuthenticated";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ExternalAccountsService } from "../external-accounts/external-accounts.service";
import { ExternalAccountProvider } from "@prisma/client";
import { CurrentUser } from "./decorators/CurrentUser";
import { User } from "@prisma/client";
import { ToyhouseOAuthPayload } from "./strategies/toyhouse.strategy";
import { consumeLinkState, issueLinkState } from "./oauth-link-state";

@Controller("auth/toyhouse")
export class ToyhouseOAuthController {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private externalAccountsService: ExternalAccountsService,
  ) {}

  private frontendUrl(): string {
    return (
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000"
    );
  }

  /**
   * `passthrough` on the response because the body is still the return value;
   * the response is here only so `issueLinkState` can set the nonce cookie
   * that binds the flow to this browser (see `oauth-link-state.ts`).
   */
  @Get()
  @AllowAnyAuthenticated()
  async initiateOAuth(
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const state = issueLinkState({
      jwtService: this.jwtService,
      jwtSecret: this.configService.getOrThrow<string>("JWT_SECRET"),
      provider: "toyhouse",
      userId: user.id,
      req,
      res,
      frontendUrl: this.frontendUrl(),
    });
    const clientId = this.configService.getOrThrow("TOYHOUSE_CLIENT_ID");
    const callbackUrl =
      this.configService.get("TOYHOUSE_CALLBACK_URL") ||
      "http://localhost:4000/auth/toyhouse/callback";

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      state,
    });

    return { url: `https://toyhou.se/~oauth/authorize?${params.toString()}` };
  }

  @Get("callback")
  @AllowUnauthenticated()
  @UseGuards(AuthGuard("toyhouse"))
  async handleCallback(@Req() req: Request, @Res() res: Response) {
    const frontendUrl = this.frontendUrl();
    // Reassigned as soon as the state token parses. Failures before that point
    // -- a missing or expired state -- have no trustworthy origin to honour and
    // land on the apex.
    let returnBase = frontendUrl;

    try {
      const link = consumeLinkState({
        jwtService: this.jwtService,
        jwtSecret: this.configService.getOrThrow<string>("JWT_SECRET"),
        provider: "toyhouse",
        req,
        res,
        frontendUrl,
      });
      returnBase = link.returnBase;
      if (!link.ok) {
        throw new Error(link.error);
      }

      const oauthData = req.user as ToyhouseOAuthPayload;
      if (!oauthData?.providerAccountId || !oauthData?.displayName) {
        throw new Error("Invalid OAuth response");
      }

      const result = await this.externalAccountsService.linkExternalAccount(
        link.userId,
        ExternalAccountProvider.TOYHOUSE,
        oauthData.providerAccountId,
        oauthData.displayName,
      );

      const callbackUrl = new URL(`${returnBase}/auth/toyhouse/callback`);
      callbackUrl.searchParams.set("success", "true");
      if (result.claimedCharacterIds.length > 0) {
        callbackUrl.searchParams.set(
          "claimedCharacters",
          result.claimedCharacterIds.length.toString(),
        );
      }
      if (result.claimedItemIds.length > 0) {
        callbackUrl.searchParams.set(
          "claimedItems",
          result.claimedItemIds.length.toString(),
        );
      }
      res.redirect(callbackUrl.toString());
    } catch (error) {
      const errorUrl = `${returnBase}/auth/toyhouse/callback?error=${encodeURIComponent(error.message)}`;
      res.redirect(errorUrl);
    }
  }
}
