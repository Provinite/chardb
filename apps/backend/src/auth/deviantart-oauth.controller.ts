import { Controller, Get, Req, Res, UseGuards, Query, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import { AllowUnauthenticated } from "./decorators/AllowUnauthenticated";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

@Controller("auth/deviantart")
export class DeviantArtOAuthController {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
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
      // Store user ID in request for the OAuth state parameter
      (req as any).userId = payload.sub;
    } catch (error) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    // The AuthGuard will handle the redirect to DeviantArt
    // The userId will be available in the strategy's authenticate method
  }

  /**
   * Handles the OAuth callback from DeviantArt
   */
  @Get("callback")
  @AllowUnauthenticated()
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
