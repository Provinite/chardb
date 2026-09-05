import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-oauth2";
import { ConfigService } from "@nestjs/config";
export interface DeviantArtProfile {
  uuid: string;
  username: string;
}

/** What `validate` puts on `req.user`, mirroring `ToyhouseOAuthPayload`. */
export interface DeviantArtOAuthPayload {
  providerAccountId: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class DeviantArtStrategy extends PassportStrategy(
  Strategy,
  "deviantart",
) {
  constructor(configService: ConfigService) {
    super({
      authorizationURL: "https://www.deviantart.com/oauth2/authorize",
      tokenURL: "https://www.deviantart.com/oauth2/token",
      clientID: configService.get("DEVIANTART_CLIENT_ID") || "",
      clientSecret: configService.get("DEVIANTART_CLIENT_SECRET") || "",
      callbackURL:
        configService.get("DEVIANTART_CALLBACK_URL") ||
        "http://localhost:3000/auth/deviantart/callback",
      scope: ["basic"],
      passReqToCallback: false,
    });

    // Override userProfile to fetch DeviantArt user info
    this.userProfile = this.fetchUserProfile.bind(this);
  }

  /**
   * Override authenticate to inject custom state parameter
   */
  // `any` rather than express's Request: @types/passport bundles its own nested
  // copy of @types/express, and the two Request types are structurally
  // incompatible, so this override cannot be typed against either without
  // failing to match the other. The body reads one property.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authenticate(req: any, options?: Record<string, unknown>) {
    // If oauthState is set in the request (from controller), use it
    const state = req.oauthState;
    if (state) {
      options = { ...options, state };
    }

    super.authenticate(req, options);
  }

  /**
   * Fetches the user profile from DeviantArt API
   */
  async fetchUserProfile(
    accessToken: string,
    done: (err?: Error | null, profile?: DeviantArtProfile) => void,
  ) {
    try {
      const response = await fetch(
        "https://www.deviantart.com/api/v1/oauth2/user/whoami",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        return done(new Error("Failed to fetch DeviantArt user profile"));
      }

      const data = await response.json();

      const profile: DeviantArtProfile = {
        uuid: data.userid,
        username: data.username,
      };

      done(null, profile);
    } catch (error) {
      done(error as Error);
    }
  }

  /**
   * Passport validate method - called after successful OAuth authentication
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: DeviantArtProfile,
  ): Promise<DeviantArtOAuthPayload> {
    return {
      providerAccountId: profile.uuid,
      displayName: profile.username,
      accessToken,
      refreshToken,
    };
  }
}
