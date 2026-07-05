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

@Controller("auth/toyhouse")
export class ToyhouseOAuthController {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private externalAccountsService: ExternalAccountsService,
  ) {}

  @Get()
  @AllowAnyAuthenticated()
  async initiateOAuth(@CurrentUser() user: User) {
    const jwtSecret = this.configService.get("JWT_SECRET");
    const state = this.jwtService.sign(
      { sub: user.id },
      { secret: jwtSecret + "_O", expiresIn: "10m" },
    );
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
    const frontendUrl =
      this.configService.get("FRONTEND_URL") || "http://localhost:3000";

    try {
      const state = req.query.state as string;
      if (!state) {
        throw new Error("Missing state parameter");
      }

      let userId: string;
      try {
        const jwtSecret = this.configService.get("JWT_SECRET");
        const statePayload = this.jwtService.verify(state, {
          secret: jwtSecret + "_O",
        });
        userId = statePayload.sub;
      } catch {
        throw new Error("Invalid or expired state token");
      }

      const oauthData = req.user as ToyhouseOAuthPayload;
      if (!oauthData?.providerAccountId || !oauthData?.displayName) {
        throw new Error("Invalid OAuth response");
      }

      const result = await this.externalAccountsService.linkExternalAccount(
        userId,
        ExternalAccountProvider.TOYHOUSE,
        oauthData.providerAccountId,
        oauthData.displayName,
      );

      const callbackUrl = new URL(`${frontendUrl}/auth/toyhouse/callback`);
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
      const errorUrl = `${frontendUrl}/auth/toyhouse/callback?error=${encodeURIComponent(error.message)}`;
      res.redirect(errorUrl);
    }
  }
}
