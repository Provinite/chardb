import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-oauth2";
import { ConfigService } from "@nestjs/config";

export interface ToyhouseProfile {
  id: string;
  username: string;
}

@Injectable()
export class ToyhouseStrategy extends PassportStrategy(Strategy, "toyhouse") {
  constructor(configService: ConfigService) {
    super({
      authorizationURL: "https://toyhou.se/~oauth/authorize",
      tokenURL: "https://toyhou.se/~oauth/token",
      clientID: configService.get("TOYHOUSE_CLIENT_ID") || "",
      clientSecret: configService.get("TOYHOUSE_CLIENT_SECRET") || "",
      callbackURL:
        configService.get("TOYHOUSE_CALLBACK_URL") ||
        "http://localhost:4000/auth/toyhouse/callback",
      passReqToCallback: false,
    });

    this.userProfile = this.fetchUserProfile.bind(this);
  }

  authenticate(req: any, options?: any) {
    const state = req.oauthState;
    if (state) {
      options = { ...options, state };
    }
    super.authenticate(req, options);
  }

  async fetchUserProfile(
    accessToken: string,
    done: (err?: Error | null, profile?: ToyhouseProfile) => void,
  ) {
    try {
      const response = await fetch("https://toyhou.se/~api/v1/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return done(new Error("Failed to fetch ToyHouse user profile"));
      }

      const data = await response.json();

      if (!data.id || !data.username) {
        return done(new Error("ToyHouse API returned an unexpected response shape"));
      }

      done(null, { id: String(data.id), username: String(data.username) });
    } catch (error) {
      done(error as Error);
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: ToyhouseProfile,
  ) {
    return {
      providerAccountId: profile.id,
      displayName: profile.username,
      accessToken,
      refreshToken,
    };
  }
}
