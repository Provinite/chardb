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
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("auth/discord")
export class DiscordOAuthController {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private externalAccountsService: ExternalAccountsService,
  ) {}

  /**
   * Initiates the Discord OAuth flow by returning the OAuth URL
   * Requires authentication via JWT in Authorization header
   */
  @Get()
  @AllowAnyAuthenticated()
  async initiateOAuth(@CurrentUser() user: User) {
    const jwtSecret = this.configService.get("JWT_SECRET");
    const state = this.jwtService.sign(
      { sub: user.id },
      { secret: jwtSecret + "_O", expiresIn: "10m" }
    );
    const clientId = this.configService.get("DISCORD_CLIENT_ID");
    const callbackUrl = this.configService.get("DISCORD_CALLBACK_URL") || "http://localhost:4000/auth/discord/callback";

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
    const frontendUrl = this.configService.get("FRONTEND_URL") || "http://localhost:3000";

    try {
      const state = req.query.state as string;
      if (!state) {
        throw new Error("Missing state parameter");
      }

      let userId: string;
      try {
        const jwtSecret = this.configService.get("JWT_SECRET");
        const statePayload = this.jwtService.verify(state, { secret: jwtSecret + "_O" });
        userId = statePayload.sub;
      } catch (error) {
        throw new Error("Invalid or expired state token");
      }

      // Get the OAuth data from Passport
      const oauthData = req.user as any;
      if (!oauthData?.providerAccountId || !oauthData?.displayName) {
        throw new Error("Invalid OAuth response");
      }

      // Link the account directly in the backend (this automatically claims pending items)
      const result = await this.externalAccountsService.linkExternalAccount(
        userId,
        ExternalAccountProvider.DISCORD,
        oauthData.providerAccountId,
        oauthData.displayName
      );

      // Redirect to frontend with success status and claimed items info
      const callbackUrl = new URL(`${frontendUrl}/auth/discord/callback`);
      callbackUrl.searchParams.set('success', 'true');
      if (result.claimedCharacterIds.length > 0) {
        callbackUrl.searchParams.set('claimedCharacters', result.claimedCharacterIds.length.toString());
      }
      if (result.claimedItemIds.length > 0) {
        callbackUrl.searchParams.set('claimedItems', result.claimedItemIds.length.toString());
      }
      res.redirect(callbackUrl.toString());
    } catch (error) {
      // Redirect to frontend with error message
      const errorUrl = `${frontendUrl}/auth/discord/callback?error=${encodeURIComponent(error.message)}`;
      res.redirect(errorUrl);
    }
  }
}
