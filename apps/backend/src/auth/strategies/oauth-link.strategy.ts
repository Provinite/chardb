import { Injectable, Type } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-oauth2";
import { ConfigService } from "@nestjs/config";
import {
  DEVIANTART,
  DISCORD,
  OAuthLinkIdentity,
  OAuthLinkProviderConfig,
  PATREON,
  TOYHOUSE,
} from "../oauth-link-providers";

/**
 * A config value that must be present and non-empty.
 *
 * Every provider's client id and secret are required at boot: an environment
 * missing one fails to start, naming the variable, rather than starting and
 * failing the first time someone tries to link.
 */
const required = (configService: ConfigService, key: string): string => {
  const value = configService.get<string>(key);
  if (!value) {
    throw new Error(
      `${key} is required but not configured. Set the ${key} environment variable.`,
    );
  }
  return value;
};

/**
 * The passport strategy behind a provider's callback route: exchanges the
 * code for a token and reads the user's identity with it. The token goes no
 * further than `fetchIdentity`.
 */
export const createOAuthLinkStrategy = (
  config: OAuthLinkProviderConfig,
): Type<unknown> => {
  @Injectable()
  class OAuthLinkStrategy extends PassportStrategy(Strategy, config.segment) {
    constructor(configService: ConfigService) {
      super({
        authorizationURL: config.authorizationURL,
        tokenURL: config.tokenURL,
        clientID: required(configService, `${config.envPrefix}_CLIENT_ID`),
        clientSecret: required(
          configService,
          `${config.envPrefix}_CLIENT_SECRET`,
        ),
        callbackURL:
          configService.get<string>(`${config.envPrefix}_CALLBACK_URL`) ||
          `http://localhost:4000/auth/${config.segment}/callback`,
        scope: config.scope ? [config.scope] : undefined,
        passReqToCallback: false,
      });

      this.userProfile = (accessToken, done) => {
        config.fetchIdentity(accessToken).then(
          (identity) => done(null, identity),
          (error: unknown) =>
            done(error instanceof Error ? error : new Error(String(error))),
        );
      };
    }

    validate(
      _accessToken: string,
      _refreshToken: string,
      identity: OAuthLinkIdentity,
    ): OAuthLinkIdentity {
      return identity;
    }
  }

  Object.defineProperty(OAuthLinkStrategy, "name", {
    value: `${config.label}Strategy`,
  });
  return OAuthLinkStrategy;
};

export const DiscordStrategy = createOAuthLinkStrategy(DISCORD);
export const DeviantArtStrategy = createOAuthLinkStrategy(DEVIANTART);
export const ToyhouseStrategy = createOAuthLinkStrategy(TOYHOUSE);
export const PatreonStrategy = createOAuthLinkStrategy(PATREON);
