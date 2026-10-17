import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-oauth2";
import { ConfigService } from "@nestjs/config";

export interface PatreonProfile {
  id: string;
  username: string;
}

export interface PatreonOAuthPayload {
  providerAccountId: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
}

/** `external_accounts.display_name` is a VARCHAR(100). */
const DISPLAY_NAME_MAX = 100;

@Injectable()
export class PatreonStrategy extends PassportStrategy(Strategy, "patreon") {
  constructor(configService: ConfigService) {
    super({
      authorizationURL: "https://www.patreon.com/oauth2/authorize",
      tokenURL: "https://www.patreon.com/api/oauth2/token",
      // passport-oauth2 throws on an empty clientID, which would take the whole
      // app down at boot in any environment not yet given Patreon credentials.
      // The placeholder keeps it up; the initiate route's `getOrThrow` is what
      // refuses to start a flow without a real one.
      clientID: configService.get("PATREON_CLIENT_ID") || "unconfigured",
      clientSecret: configService.get("PATREON_CLIENT_SECRET") || "",
      callbackURL:
        configService.get("PATREON_CALLBACK_URL") ||
        "http://localhost:4000/auth/patreon/callback",
      scope: ["identity"],
      passReqToCallback: false,
    });

    this.userProfile = this.fetchUserProfile.bind(this);
  }

  /**
   * Patreon's v2 API returns no attributes unless they are asked for by name.
   * `vanity` is the handle in the user's profile URL and is often unset, so
   * `full_name` is the fallback display name.
   */
  async fetchUserProfile(
    accessToken: string,
    done: (err?: Error | null, profile?: PatreonProfile) => void,
  ) {
    try {
      const response = await fetch(
        "https://www.patreon.com/api/oauth2/v2/identity?fields%5Buser%5D=full_name,vanity",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        return done(new Error("Failed to fetch Patreon user profile"));
      }

      const data = await response.json();
      const id = data?.data?.id;
      const attributes = data?.data?.attributes ?? {};
      const username = attributes.vanity || attributes.full_name;

      if (!id || !username) {
        return done(
          new Error("Patreon API returned an unexpected response shape"),
        );
      }

      done(null, {
        id: String(id),
        username: String(username).slice(0, DISPLAY_NAME_MAX),
      });
    } catch (error) {
      done(error as Error);
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: PatreonProfile,
  ): Promise<PatreonOAuthPayload> {
    return {
      providerAccountId: profile.id,
      displayName: profile.username,
      accessToken,
      refreshToken,
    };
  }
}
