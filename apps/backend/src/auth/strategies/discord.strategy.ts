import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-oauth2";
import { ConfigService } from "@nestjs/config";

export interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string;
}

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, "discord") {
  constructor(configService: ConfigService) {
    super({
      authorizationURL: "https://discord.com/api/oauth2/authorize",
      tokenURL: "https://discord.com/api/oauth2/token",
      clientID: configService.get("DISCORD_CLIENT_ID") || "",
      clientSecret: configService.get("DISCORD_CLIENT_SECRET") || "",
      callbackURL:
        configService.get("DISCORD_CALLBACK_URL") ||
        "http://localhost:4000/auth/discord/callback",
      scope: ["identify"],
      passReqToCallback: false,
    });

    // Override userProfile to fetch Discord user info
    this.userProfile = this.fetchUserProfile.bind(this);
  }

  /**
   * Override authenticate to inject custom state parameter
   */
  authenticate(req: any, options?: any) {
    // If oauthState is set in the request (from controller), use it
    const state = req.oauthState;
    if (state) {
      options = { ...options, state };
    }

    super.authenticate(req, options);
  }

  /**
   * Fetches the user profile from Discord API
   */
  async fetchUserProfile(
    accessToken: string,
    done: (err?: Error | null, profile?: any) => void,
  ) {
    try {
      const response = await fetch(
        "https://discord.com/api/v10/users/@me",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        return done(new Error("Failed to fetch Discord user profile"));
      }

      const data = await response.json();

      const profile: DiscordProfile = {
        id: data.id,
        username: data.username,
        discriminator: data.discriminator,
        global_name: data.global_name,
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
    profile: DiscordProfile,
  ) {
    // Format display name: use global_name if available, otherwise username#discriminator or @username
    let displayName: string;
    if (profile.global_name) {
      displayName = profile.global_name;
    } else if (profile.discriminator && profile.discriminator !== "0") {
      // Old Discord format: username#discriminator
      displayName = `${profile.username}#${profile.discriminator}`;
    } else {
      // New Discord format: @username
      displayName = `@${profile.username}`;
    }

    return {
      providerAccountId: profile.id,
      displayName,
      accessToken,
      refreshToken,
    };
  }
}
