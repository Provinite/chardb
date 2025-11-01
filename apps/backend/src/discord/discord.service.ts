import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, GatewayIntentBits, Guild } from 'discord.js';

export interface DiscordGuildInfo {
  id: string;
  name: string;
  botHasAccess: boolean;
}

@Injectable()
export class DiscordService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordService.name);
  private client: Client;
  private isReady = false;

  constructor(private configService: ConfigService) {
    // Initialize Discord client with necessary intents
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
      ],
    });
  }

  async onModuleInit() {
    const botToken = this.configService.get<string>('DISCORD_BOT_TOKEN');

    if (!botToken) {
      this.logger.warn('DISCORD_BOT_TOKEN not configured. Discord features will be disabled.');
      return;
    }

    try {
      this.logger.log('Connecting Discord bot...');

      // Set up ready event
      this.client.once('ready', () => {
        this.isReady = true;
        this.logger.log(`Discord bot connected as ${this.client.user?.tag}`);
      });

      // Set up error handler
      this.client.on('error', (error) => {
        this.logger.error('Discord client error:', error);
      });

      await this.client.login(botToken);
    } catch (error) {
      this.logger.error('Failed to connect Discord bot:', error);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      this.logger.log('Disconnecting Discord bot...');
      await this.client.destroy();
    }
  }

  /**
   * Check if the Discord bot is ready and connected
   */
  isConnected(): boolean {
    return this.isReady;
  }

  /**
   * Generate the Discord bot invite URL
   * Permissions: View Channels (268435456)
   */
  generateBotInviteUrl(): string {
    const clientId = this.configService.get<string>('DISCORD_CLIENT_ID');

    if (!clientId) {
      throw new Error('DISCORD_CLIENT_ID not configured');
    }

    const permissions = '268435456'; // View Channels
    const scopes = 'bot';

    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}`;
  }

  /**
   * Get guild information and verify bot access
   */
  async getGuildInfo(guildId: string): Promise<DiscordGuildInfo | null> {
    if (!this.isReady) {
      throw new Error('Discord bot is not connected');
    }

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
        name: 'Unknown',
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
  async resolveUsernameToId(guildId: string, username: string): Promise<string | null> {
    if (!this.isReady) {
      throw new Error('Discord bot is not connected');
    }

    // Normalize username (remove @ if present)
    const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;

    try {
      // Fetch the guild
      const guild: Guild = await this.client.guilds.fetch(guildId);

      // Fetch all members (required for searching)
      await guild.members.fetch();

      // Search for member by username
      const member = guild.members.cache.find(
        (m) => m.user.username.toLowerCase() === normalizedUsername.toLowerCase()
      );

      if (!member) {
        this.logger.debug(`User "${normalizedUsername}" not found in guild ${guildId}`);
        return null;
      }

      this.logger.debug(`Resolved "${normalizedUsername}" to ID ${member.user.id}`);
      return member.user.id;
    } catch (error) {
      this.logger.error(`Failed to resolve username in guild ${guildId}:`, error);
      throw new Error('Failed to search Discord server. Bot may not have access to this server.');
    }
  }

  /**
   * Verify that the bot has access to a guild
   */
  async verifyGuildAccess(guildId: string): Promise<boolean> {
    if (!this.isReady) {
      return false;
    }

    try {
      await this.client.guilds.fetch(guildId);
      return true;
    } catch (error) {
      return false;
    }
  }
}
