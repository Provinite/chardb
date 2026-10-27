import type { KeyObject } from "crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseDiscordPublicKey } from "./discord/verify-signature";

/**
 * The Halloween bot is its own Discord application, separate from the one
 * chardb uses for account linking, so it has its own credentials. All are
 * required, as is FRONTEND_URL for its images: a backend that cannot answer
 * Discord should fail at boot, not on the first `/knock`.
 */
@Injectable()
export class HalloweenConfig {
  readonly applicationId: string;
  /**
   * The Ed25519 key from the application's General Information page, parsed
   * once here rather than on every request.
   */
  readonly publicKey: KeyObject;
  readonly botToken: string;
  /**
   * Where the embed author icons (`icon/0.png`..) and candy images
   * (`candy/candy-corn.png`..) live: the frontend's `public/halloween`, published
   * with the frontend. Always ends in `/`.
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
    const publicKeyHex = required("HALLOWEEN_DISCORD_PUBLIC_KEY");
    try {
      this.publicKey = parseDiscordPublicKey(publicKeyHex);
    } catch {
      throw new Error(
        "HALLOWEEN_DISCORD_PUBLIC_KEY must be the 64-character hex Ed25519 public key from the Discord application's General Information page.",
      );
    }
    this.botToken = required("HALLOWEEN_DISCORD_BOT_TOKEN");
    this.imageBaseUrl = new URL(
      "/halloween/",
      required("FRONTEND_URL"),
    ).toString();
  }
}
