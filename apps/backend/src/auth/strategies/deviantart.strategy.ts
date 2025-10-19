import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';

export interface DeviantArtProfile {
  uuid: string;
  username: string;
}

@Injectable()
export class DeviantArtStrategy extends PassportStrategy(
  Strategy,
  'deviantart',
) {
  constructor(configService: ConfigService) {
    super({
      authorizationURL: 'https://www.deviantart.com/oauth2/authorize',
      tokenURL: 'https://www.deviantart.com/oauth2/token',
      clientID: configService.get('DEVIANTART_CLIENT_ID') || '',
      clientSecret: configService.get('DEVIANTART_CLIENT_SECRET') || '',
      callbackURL:
        configService.get('DEVIANTART_CALLBACK_URL') ||
        'http://localhost:3000/auth/deviantart/callback',
      scope: ['basic'],
      passReqToCallback: false,
    });

    // Override userProfile to fetch DeviantArt user info
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
   * Fetches the user profile from DeviantArt API
   */
  async fetchUserProfile(
    accessToken: string,
    done: (err?: Error | null, profile?: any) => void,
  ) {
    try {
      const response = await fetch(
        'https://www.deviantart.com/api/v1/oauth2/user/whoami',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        return done(new Error('Failed to fetch DeviantArt user profile'));
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
  ) {
    return {
      providerAccountId: profile.uuid,
      displayName: profile.username,
      accessToken,
      refreshToken,
    };
  }
}
