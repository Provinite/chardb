import { Controller, Get, Req, Res, UseGuards, Query } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/CurrentUser";
import { User } from "@prisma/client";
import { ConfigService } from "@nestjs/config";

@Controller("auth/deviantart")
export class DeviantArtOAuthController {
  constructor(private configService: ConfigService) {}

  /**
   * Initiates the DeviantArt OAuth flow
   * Requires the user to be authenticated
   */
  @Get()
  @UseGuards(JwtAuthGuard, AuthGuard("deviantart"))
  async initiateOAuth(@CurrentUser() user: User) {
    // This endpoint triggers the passport strategy
    // User will be redirected to DeviantArt
  }

  /**
   * Handles the OAuth callback from DeviantArt
   */
  @Get("callback")
  @UseGuards(AuthGuard("deviantart"))
  async handleCallback(@Req() req: Request, @Res() res: Response) {
    // At this point, Passport has validated the OAuth response
    // req.user contains the validated profile from the strategy
    const oauthData = req.user as any;

    // Store the OAuth data in the session/query to pass back to frontend
    const frontendUrl = this.configService.get("FRONTEND_URL") || "http://localhost:3000";

    try {
      // The actual account linking will happen via GraphQL mutation from frontend
      // We just pass the OAuth data back to the frontend
      const callbackUrl = `${frontendUrl}/auth/deviantart/callback?` +
        `providerAccountId=${encodeURIComponent(oauthData.providerAccountId)}` +
        `&displayName=${encodeURIComponent(oauthData.displayName)}` +
        `&success=true`;

      res.redirect(callbackUrl);
    } catch (error) {
      const errorUrl = `${frontendUrl}/auth/deviantart/callback?error=${encodeURIComponent(error.message)}`;
      res.redirect(errorUrl);
    }
  }
}
