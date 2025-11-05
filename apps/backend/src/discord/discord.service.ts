import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { REST } from "@discordjs/rest";
import { API } from "@discordjs/core";
import { DiscordUserInfo } from "./dto/discord-user-info.dto";

export interface DiscordGuildInfo {
  id: string;
  name: string;
  botHasAccess: boolean;
}

/**
 * Discord service using REST-only approach (no persistent Gateway connection)
 * All Discord API interactions are done via HTTP REST calls
 */
@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly rest: REST;
  private readonly api: API;

  constructor(private configService: ConfigService) {
    const botToken = this.configService.get<string>("DISCORD_BOT_TOKEN");

    if (!botToken) {
      throw new Error(
        "DISCORD_BOT_TOKEN is required but not configured. Set the DISCORD_BOT_TOKEN environment variable.",
      );
    }

    // Initialize REST client with bot token
    this.rest = new REST({ version: "10" }).setToken(botToken);

    // Initialize API wrapper around REST client
    this.api = new API(this.rest);

    this.logger.log("Discord REST client initialized");
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
    try {
      const guild = await this.api.guilds.get(guildId);

      return {
        id: guild.id,
        name: guild.name,
        botHasAccess: true,
      };
    } catch (error) {
      // Bot doesn't have access to this guild
      this.logger.debug(
        `Bot doesn't have access to guild ${guildId}:`,
        error,
      );
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
    // Normalize username (remove @ if present)
    const normalizedUsername = username.startsWith("@")
      ? username.slice(1)
      : username;

    try {
      // Search for members matching the username query (limit to 50 for performance)
      const members = await this.api.guilds.searchForMembers(guildId, {
        query: normalizedUsername,
        limit: 50,
      });

      // Find exact match (case-insensitive)
      const member = members.find(
        (m) => m.user?.username.toLowerCase() === normalizedUsername.toLowerCase(),
      );

      if (!member || !member.user) {
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
    try {
      await this.api.users.get(userId);
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
      await this.api.guilds.get(guildId);
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
    try {
      const user = await this.api.users.get(userId);

      // Build avatar URL if avatar hash exists
      const avatarUrl = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${
            user.avatar.startsWith("a_") ? "gif" : "png"
          }`
        : undefined;

      return {
        userId: user.id,
        username: user.username,
        displayName: user.global_name || undefined,
        avatarUrl,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch Discord user ${userId}:`, error);
      throw new NotFoundException(
        `Discord user not found. The user ID may be invalid or the user may have deleted their account.`,
      );
    }
  }
}
