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
import { DiscordOAuthPayload } from "./strategies/discord.strategy";
import { consumeLinkState, issueLinkState } from "./oauth-link-state";

@Controller("auth/discord")
export class DiscordOAuthController {
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
   * Initiates the Discord OAuth flow by returning the OAuth URL
   * Requires authentication via JWT in Authorization header
   *
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
      provider: "discord",
      userId: user.id,
      req,
      res,
      frontendUrl: this.frontendUrl(),
    });
    const clientId = this.configService.get("DISCORD_CLIENT_ID");
    const callbackUrl =
      this.configService.get("DISCORD_CALLBACK_URL") ||
      "http://localhost:4000/auth/discord/callback";

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: "identify",
      state: state,
    });

    const oauthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;

    return { url: oauthUrl };
  }

  /**
   * Handles the OAuth callback from Discord
   */
  @Get("callback")
  @AllowUnauthenticated()
  @UseGuards(AuthGuard("discord"))
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
        provider: "discord",
        req,
        res,
        frontendUrl,
      });
      returnBase = link.returnBase;
      if (!link.ok) {
        throw new Error(link.error);
      }

      // Get the OAuth data from Passport
      const oauthData = req.user as DiscordOAuthPayload;
      if (!oauthData?.providerAccountId || !oauthData?.displayName) {
        throw new Error("Invalid OAuth response");
      }

      // Link the account directly in the backend (this automatically claims pending items)
      const result = await this.externalAccountsService.linkExternalAccount(
        link.userId,
        ExternalAccountProvider.DISCORD,
        oauthData.providerAccountId,
        oauthData.displayName,
      );

      // Redirect to frontend with success status and claimed items info
      const callbackUrl = new URL(`${returnBase}/auth/discord/callback`);
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
      // Redirect to frontend with error message
      const errorUrl = `${returnBase}/auth/discord/callback?error=${encodeURIComponent(error.message)}`;
      res.redirect(errorUrl);
    }
  }
}
