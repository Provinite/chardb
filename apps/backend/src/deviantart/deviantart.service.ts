import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface CachedToken {
  token: string;
  expiresAt: number;
}

/**
 * DeviantArt API service for username resolution.
 * Uses client_credentials OAuth flow for server-to-server API access.
 * Mirrors the Discord service pattern for consistency.
 */
@Injectable()
export class DeviantArtService {
  private readonly logger = new Logger(DeviantArtService.name);
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly isConfigured: boolean;
  private cachedToken: CachedToken | null = null;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>("DEVIANTART_CLIENT_ID");
    this.clientSecret = this.configService.get<string>(
      "DEVIANTART_CLIENT_SECRET",
    );

    this.isConfigured = !!(this.clientId && this.clientSecret);

    if (!this.isConfigured) {
      this.logger.warn(
        "DeviantArt credentials not configured. Username resolution will be unavailable.",
      );
    } else {
      this.logger.log("DeviantArt API client initialized");
    }
  }

  /**
   * Resolve a DeviantArt username to its UUID.
   * @param username The DeviantArt username to look up
   * @returns The user's UUID (as stored in external_accounts)
   * @throws NotFoundException if the username doesn't exist on DeviantArt
   * @throws BadRequestException if DeviantArt credentials are not configured
   */
  async resolveUsernameToUuid(username: string): Promise<string> {
    if (!this.isConfigured) {
      throw new BadRequestException(
        "DeviantArt API credentials are not configured. Cannot resolve DeviantArt usernames.",
      );
    }

    const token = await this.getAccessToken();

    try {
      const response = await fetch(
        `https://www.deviantart.com/api/v1/oauth2/user/profile/${encodeURIComponent(username)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 404) {
        throw new NotFoundException(
          `DeviantArt user "${username}" not found. Please verify the username is correct.`,
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `DeviantArt API error (${response.status}): ${errorText}`,
        );

        // DA returns 400 (not 404) with error_description "user not found." for nonexistent users
        try {
          const errorData = JSON.parse(errorText);
          if (
            errorData.error_description &&
            errorData.error_description
              .toLowerCase()
              .includes("user not found")
          ) {
            throw new NotFoundException(
              `DeviantArt user "${username}" not found. Please verify the username is correct.`,
            );
          }
        } catch (parseError) {
          if (parseError instanceof NotFoundException) throw parseError;
          // JSON parse failed — fall through to generic error
        }

        throw new BadRequestException(
          `Failed to look up DeviantArt user "${username}". Please try again later.`,
        );
      }

      const data = await response.json();
      const uuid = data?.user?.userid;

      if (!uuid) {
        this.logger.error(
          `DeviantArt API returned unexpected response for "${username}": missing user.userid`,
        );
        throw new BadRequestException(
          `Failed to resolve DeviantArt user "${username}". Unexpected API response.`,
        );
      }

      this.logger.debug(`Resolved DeviantArt user "${username}" to UUID ${uuid}`);
      return uuid;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to resolve DeviantArt username "${username}":`,
        error,
      );
      throw new BadRequestException(
        `Failed to look up DeviantArt user "${username}". Please try again later.`,
      );
    }
  }

  /**
   * Get a valid client_credentials access token, using cache when possible.
   */
  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token;
    }

    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId!,
      client_secret: this.clientSecret!,
    });

    const response = await fetch("https://www.deviantart.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        `Failed to get DeviantArt access token (${response.status}): ${errorText}`,
      );
      throw new BadRequestException(
        "Failed to authenticate with DeviantArt API. Please check credentials.",
      );
    }

    const data = await response.json();
    const expiresIn = data.expires_in ?? 3600;

    this.cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (expiresIn - 60) * 1000, // 60-second buffer
    };

    this.logger.debug("DeviantArt access token refreshed");
    return this.cachedToken.token;
  }
}
