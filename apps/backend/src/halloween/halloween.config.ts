import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * The Halloween bot is its own Discord application, separate from the one
 * chardb uses for account linking, so it has its own credentials. All four are
 * required: a backend that cannot answer Discord should fail at boot, not on
 * the first `/knock`.
 */
@Injectable()
export class HalloweenConfig {
  readonly applicationId: string;
  /** Hex Ed25519 key from the application's General Information page. */
  readonly publicKey: string;
  readonly botToken: string;
  /**
   * Where the embed author icons (`icon/0.png`..) and candy images
   * (`candy/0.png`..) live. Always ends in `/`.
   */
  readonly imageBaseUrl: string;

  constructor(config: ConfigService) {
    const required = (key: string): string => {
      const value = config.get<string>(key);
      if (!value) {
        throw new Error(
          `${key} is required but not configured. Set the ${key} environment variable.`,
        );
      }
      return value;
    };

    this.applicationId = required("HALLOWEEN_DISCORD_APPLICATION_ID");
    this.publicKey = required("HALLOWEEN_DISCORD_PUBLIC_KEY");
    this.botToken = required("HALLOWEEN_DISCORD_BOT_TOKEN");
    const imageBaseUrl = required("HALLOWEEN_IMAGE_BASE_URL");
    this.imageBaseUrl = imageBaseUrl.endsWith("/")
      ? imageBaseUrl
      : `${imageBaseUrl}/`;
  }
}
