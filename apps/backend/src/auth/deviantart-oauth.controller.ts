import { Controller, Get, Req, Res, UseGuards, Query, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import { AllowUnauthenticated } from "./decorators/AllowUnauthenticated";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ExternalAccountsService } from "../external-accounts/external-accounts.service";
import { ExternalAccountProvider } from "@prisma/client";

@Controller("auth/deviantart")
export class DeviantArtOAuthController {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private externalAccountsService: ExternalAccountsService,
  ) {}

  /**
   * Initiates the DeviantArt OAuth flow
   * Accepts JWT token as query parameter to maintain user context across OAuth redirect
   */
  @Get()
  @AllowUnauthenticated()
  @UseGuards(AuthGuard("deviantart"))
  async initiateOAuth(@Query("token") token: string, @Req() req: Request) {
    // Verify the JWT token and extract user ID
    if (!token) {
      throw new UnauthorizedException("Authentication token required");
    }

    try {
      const payload = this.jwtService.verify(token);
      // Create a state JWT containing the user ID
      const state = this.jwtService.sign(
        { sub: payload.sub },
        { expiresIn: "10m" }
      );
      // Store state in request so the strategy can use it
      (req as any).oauthState = state;
    } catch (error) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    // The AuthGuard will handle the redirect to DeviantArt
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
