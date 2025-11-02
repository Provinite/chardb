import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client, GatewayIntentBits, Guild } from "discord.js";
import { DiscordUserInfo } from "./dto/discord-user-info.dto";

export interface DiscordGuildInfo {
  id: string;
  name: string;
  botHasAccess: boolean;
}

@Injectable()
export class DiscordService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordService.name);
  private client: Client;
  private readyPromise: Promise<void>;

  constructor(private configService: ConfigService) {
    // Initialize Discord client with necessary intents
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    });
  }

  async onModuleInit() {
    const botToken = this.configService.get<string>("DISCORD_BOT_TOKEN");

    if (!botToken) {
      throw new Error(
        "DISCORD_BOT_TOKEN is required but not configured. Set the DISCORD_BOT_TOKEN environment variable.",
      );
    }

    try {
      this.logger.log("Connecting Discord bot...");

      // Create promise that resolves when bot is ready
      this.readyPromise = new Promise((resolve, reject) => {
        let settled = false;
        let timeoutId: NodeJS.Timeout;

        // Cleanup function to prevent memory leaks and multiple settlements
        const cleanup = () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        };

        // Handle successful connection
        const handleResolve = () => {
          if (settled) return;
          settled = true;
          cleanup();
          this.logger.log(`Discord bot connected as ${this.client.user?.tag}`);
          resolve();
        };

        // Handle connection errors
        const handleReject = (error: Error) => {
          if (settled) return;
          settled = true;
          cleanup();
          this.logger.error("Discord client initialization error:", error);
          reject(error);
        };

        // Set up ready event
        this.client.once("ready", handleResolve);

        // Set up error handler for initialization errors - reject promise on error
        this.client.once("error", handleReject);

        // Timeout after 30 seconds
        timeoutId = setTimeout(() => {
          handleReject(
            new Error("Discord bot connection timeout after 30 seconds"),
          );
        }, 30000);
      });

      // Start login process
      await this.client.login(botToken);

      // Wait for ready event before continuing
      await this.readyPromise;
    } catch (error) {
      this.logger.error("Failed to connect Discord bot:", error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      this.logger.log("Disconnecting Discord bot...");
      await this.client.destroy();
    }
  }

  /**
   * Ensure the Discord bot is ready, waiting if necessary
   * @throws Error if bot failed to connect
   */
  private async ensureReady(): Promise<void> {
    await this.readyPromise;
  }

  /**
   * Check if the Discord bot is ready and connected
   */
  isConnected(): boolean {
    return this.client.isReady();
  }

  /**
   * Generate the Discord bot invite URL
   * Permissions: View Channels (1024) - Minimum permission needed to access guild and read members
   */
  generateBotInviteUrl(): string {
    const clientId = this.configService.get<string>("DISCORD_CLIENT_ID");

    if (!clientId) {
      throw new Error("DISCORD_CLIENT_ID not configured");
    }

    const permissions = "1024"; // VIEW_CHANNEL - required to access guild and read member list
    const scopes = "bot";

    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}`;
  }

  /**
   * Get guild information and verify bot access
   */
  async getGuildInfo(guildId: string): Promise<DiscordGuildInfo | null> {
    await this.ensureReady();

    try {
      const guild = await this.client.guilds.fetch(guildId);

      return {
        id: guild.id,
        name: guild.name,
        botHasAccess: true,
      };
    } catch (error) {
      // Bot doesn't have access to this guild
      return {
        id: guildId,
        name: "Unknown",
        botHasAccess: false,
      };
    }
  }

  /**
   * Resolve a Discord username to a user ID within a specific guild
   * @param guildId The Discord guild (server) ID
   * @param username The username to resolve (with or without @ prefix)
   * @returns The Discord user ID, or null if not found
   */
  async resolveUsernameToId(
    guildId: string,
    username: string,
  ): Promise<string | null> {
    await this.ensureReady();

    // Normalize username (remove @ if present)
    const normalizedUsername = username.startsWith("@")
      ? username.slice(1)
      : username;

    try {
      // Fetch the guild
      const guild: Guild = await this.client.guilds.fetch(guildId);

      // Fetch members matching the username query (limit to 50 for performance)
      // This prevents memory issues on large servers while still finding exact matches
      await guild.members.fetch({ query: normalizedUsername, limit: 50 });

      // Search for member by username
      const member = guild.members.cache.find(
        (m) =>
          m.user.username.toLowerCase() === normalizedUsername.toLowerCase(),
      );

      if (!member) {
        this.logger.debug(
          `User "${normalizedUsername}" not found in guild ${guildId}`,
        );
        return null;
      }

      this.logger.debug(
        `Resolved "${normalizedUsername}" to ID ${member.user.id}`,
      );
      return member.user.id;
    } catch (error) {
      this.logger.error(
        `Failed to resolve username in guild ${guildId}:`,
        error,
      );
      throw new Error(
        "Failed to search Discord server. Bot may not have access to this server.",
      );
    }
  }

  /**
   * Validate that a Discord user ID exists
   * @param userId The Discord user ID to validate
   * @returns true if user exists, false otherwise
   */
  async validateUserId(userId: string): Promise<boolean> {
    await this.ensureReady();

    try {
      await this.client.users.fetch(userId);
      return true;
    } catch (error) {
      this.logger.debug(`Discord user ID ${userId} not found or invalid`);
      return false;
    }
  }

  /**
   * Verify that the bot has access to a guild
   */
  async verifyGuildAccess(guildId: string): Promise<boolean> {
    try {
      await this.ensureReady();
      await this.client.guilds.fetch(guildId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get Discord user information by user ID
   * Fetches publicly available user data including avatar
   * @param userId The Discord user ID (snowflake)
   * @returns Discord user information
   * @throws NotFoundException if user is not found
   */
  async getUserInfo(userId: string): Promise<DiscordUserInfo> {
    await this.ensureReady();

    try {
      const user = await this.client.users.fetch(userId);

      return {
        userId: user.id,
        username: user.username,
        displayName: user.displayName || undefined,
        avatarUrl: user.avatarURL() || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch Discord user ${userId}:`, error);
      throw new NotFoundException(
        `Discord user not found. The user ID may be invalid or the user may have deleted their account.`,
      );
    }
  }
}
