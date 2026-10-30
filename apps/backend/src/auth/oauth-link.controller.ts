import {
  Controller,
  Get,
  Injectable,
  Req,
  Res,
  Type,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { User } from "@chardb/database";
import { AllowUnauthenticated } from "./decorators/AllowUnauthenticated";
import { AllowAnyAuthenticated } from "./decorators/AllowAnyAuthenticated";
import { CurrentUser } from "./decorators/CurrentUser";
import { ExternalAccountsService } from "../external-accounts/external-accounts.service";
import { consumeLinkState, issueLinkState } from "./oauth-link-state";
import {
  DEVIANTART,
  DISCORD,
  OAuthLinkIdentity,
  OAuthLinkProviderConfig,
  PATREON,
  TOYHOUSE,
} from "./oauth-link-providers";

/** What the callback guard leaves on `req.user` when the provider leg failed. */
export interface OAuthLinkFailure {
  failed: true;
  reason: string;
}

export type OAuthLinkGuardResult = OAuthLinkIdentity | OAuthLinkFailure;

const isIdentity = (value: unknown): value is OAuthLinkIdentity =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as OAuthLinkIdentity).providerAccountId === "string" &&
  typeof (value as OAuthLinkIdentity).displayName === "string";

/**
 * Passport's guard for the callback, made to never throw.
 *
 * The stock `AuthGuard` answers a failed provider leg -- the user clicking
 * Deny, a failed token exchange, a failed identity fetch -- with a bare 401 on
 * the API host, before the handler runs. That strands the user on a JSON page
 * with no way back to the app, and leaves the nonce cookie uncleared. Here a
 * failure becomes a value on `req.user` instead, so the handler still runs,
 * still spends the nonce, and redirects to the frontend with the reason.
 */
export const createOAuthLinkCallbackGuard = (
  config: OAuthLinkProviderConfig,
): Type<unknown> => {
  @Injectable()
  class OAuthLinkCallbackGuard extends AuthGuard(config.segment) {
    handleRequest<TUser = OAuthLinkGuardResult>(
      err: unknown,
      user: unknown,
    ): TUser {
      if (!err && isIdentity(user)) {
        return user as TUser;
      }
      const failure: OAuthLinkFailure = {
        failed: true,
        reason:
          err instanceof Error
            ? err.message
            : `${config.label} did not authorize the link`,
      };
      return failure as TUser;
    }
  }
  return OAuthLinkCallbackGuard;
};

/**
 * The two routes of a provider's linking flow: `GET /auth/<segment>` hands the
 * signed-in user the provider's authorize URL, and `GET /auth/<segment>/callback`
 * is where the provider sends them back to be linked.
 */
export const createOAuthLinkController = (
  config: OAuthLinkProviderConfig,
): Type<OAuthLinkControllerShape> => {
  const CallbackGuard = createOAuthLinkCallbackGuard(config);

  @Controller(`auth/${config.segment}`)
  class OAuthLinkController implements OAuthLinkControllerShape {
    constructor(
      private configService: ConfigService,
      private jwtService: JwtService,
      private externalAccountsService: ExternalAccountsService,
    ) {}

    private frontendUrl(): string {
      return (
        this.configService.get<string>("FRONTEND_URL") ||
        "http://localhost:3000"
      );
    }

    /**
     * `passthrough` on the response because the body is still the return
     * value; the response is here only so `issueLinkState` can set the nonce
     * cookie that binds the flow to this browser (see `oauth-link-state.ts`).
     */
    @Get()
    @AllowAnyAuthenticated()
    async initiateOAuth(
      @CurrentUser() user: User,
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
    ): Promise<{ url: string }> {
      const state = issueLinkState({
        jwtService: this.jwtService,
        jwtSecret: this.configService.getOrThrow<string>("JWT_SECRET"),
        provider: config.segment,
        userId: user.id,
        req,
        res,
        frontendUrl: this.frontendUrl(),
      });

      const params = new URLSearchParams({
        client_id: this.configService.getOrThrow<string>(
          `${config.envPrefix}_CLIENT_ID`,
        ),
        redirect_uri:
          this.configService.get<string>(`${config.envPrefix}_CALLBACK_URL`) ||
          `http://localhost:4000/auth/${config.segment}/callback`,
        response_type: "code",
        state,
      });
      if (config.scope) {
        params.set("scope", config.scope);
      }

      return { url: `${config.authorizationURL}?${params.toString()}` };
    }

    @Get("callback")
    @AllowUnauthenticated()
    @UseGuards(CallbackGuard)
    async handleCallback(
      @Req() req: Request,
      @Res() res: Response,
    ): Promise<void> {
      const frontendUrl = this.frontendUrl();
      // Reassigned as soon as the state token parses. Failures before that
      // point -- a missing or expired state -- have no trustworthy origin to
      // honour and land on the apex.
      let returnBase = frontendUrl;

      try {
        const link = consumeLinkState({
          jwtService: this.jwtService,
          jwtSecret: this.configService.getOrThrow<string>("JWT_SECRET"),
          provider: config.segment,
          req,
          res,
          frontendUrl,
        });
        returnBase = link.returnBase;
        if (!link.ok) {
          throw new Error(link.error);
        }

        const result = req.user as OAuthLinkGuardResult | undefined;
        if (!result) {
          throw new Error("Invalid OAuth response");
        }
        if ("failed" in result) {
          throw new Error(result.reason);
        }

        // Also claims anything pending for this account.
        const linked = await this.externalAccountsService.linkExternalAccount(
          link.userId,
          config.provider,
          result.providerAccountId,
          result.displayName,
        );

        const callbackUrl = new URL(
          `${returnBase}/auth/${config.segment}/callback`,
        );
        callbackUrl.searchParams.set("success", "true");
        if (linked.claimedCharacterIds.length > 0) {
          callbackUrl.searchParams.set(
            "claimedCharacters",
            linked.claimedCharacterIds.length.toString(),
          );
        }
        if (linked.claimedItemIds.length > 0) {
          callbackUrl.searchParams.set(
            "claimedItems",
            linked.claimedItemIds.length.toString(),
          );
        }
        res.redirect(callbackUrl.toString());
      } catch (error) {
        const errorUrl = `${returnBase}/auth/${config.segment}/callback?error=${encodeURIComponent(error.message)}`;
        res.redirect(errorUrl);
      }
    }
  }

  Object.defineProperty(OAuthLinkController, "name", {
    value: `${config.label}OAuthController`,
  });
  return OAuthLinkController;
};

/** The routes every provider's controller exposes. */
export interface OAuthLinkControllerShape {
  initiateOAuth(
    user: User,
    req: Request,
    res: Response,
  ): Promise<{ url: string }>;
  handleCallback(req: Request, res: Response): Promise<void>;
}

export const DiscordOAuthController = createOAuthLinkController(DISCORD);
export const DeviantArtOAuthController = createOAuthLinkController(DEVIANTART);
export const ToyhouseOAuthController = createOAuthLinkController(TOYHOUSE);
export const PatreonOAuthController = createOAuthLinkController(PATREON);
