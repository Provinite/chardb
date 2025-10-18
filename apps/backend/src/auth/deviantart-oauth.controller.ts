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

@Controller("auth/deviantart")
export class DeviantArtOAuthController {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private externalAccountsService: ExternalAccountsService,
  ) {}

  /**
   * Initiates the DeviantArt OAuth flow by returning the OAuth URL
   * Requires authentication via JWT in Authorization header
   */
  @Get()
  @AllowAnyAuthenticated()
  async initiateOAuth(@CurrentUser() user: User) {
    // Create a state JWT containing the user ID
    const state = this.jwtService.sign(
      { sub: user.id },
      { expiresIn: "10m" }
    );

    // Manually construct the DeviantArt OAuth URL
    const clientId = this.configService.get("DEVIANTART_CLIENT_ID");
    const callbackUrl = this.configService.get("DEVIANTART_CALLBACK_URL") || "http://localhost:4000/auth/deviantart/callback";

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: "basic",
      state: state,
    });

    const oauthUrl = `https://www.deviantart.com/oauth2/authorize?${params.toString()}`;

    return { url: oauthUrl };
  }

  /**
   * Handles the OAuth callback from DeviantArt
   */
  @Get("callback")
  @AllowUnauthenticated()
  @UseGuards(AuthGuard("deviantart"))
  async handleCallback(@Req() req: Request, @Res() res: Response) {
    const frontendUrl = this.configService.get("FRONTEND_URL") || "http://localhost:3000";

    try {
      // Verify the state parameter to get user ID
      const state = req.query.state as string;
      if (!state) {
        throw new Error("Missing state parameter");
      }

      let userId: string;
      try {
        const statePayload = this.jwtService.verify(state);
        userId = statePayload.sub;
      } catch (error) {
        throw new Error("Invalid or expired state token");
      }

      // Get the OAuth data from Passport
      const oauthData = req.user as any;
      if (!oauthData?.providerAccountId || !oauthData?.displayName) {
        throw new Error("Invalid OAuth response");
      }

      // Link the account directly in the backend
      await this.externalAccountsService.linkExternalAccount(
        userId,
        ExternalAccountProvider.DEVIANTART,
        oauthData.providerAccountId,
        oauthData.displayName
      );

      // Redirect to frontend with success status only
      const callbackUrl = `${frontendUrl}/auth/deviantart/callback?success=true`;
      res.redirect(callbackUrl);
    } catch (error) {
      // Redirect to frontend with error message
      const errorUrl = `${frontendUrl}/auth/deviantart/callback?error=${encodeURIComponent(error.message)}`;
      res.redirect(errorUrl);
    }
  }
}
