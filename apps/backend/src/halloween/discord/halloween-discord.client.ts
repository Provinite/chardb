import { Injectable } from "@nestjs/common";
import { DiscordAPIError, REST } from "@discordjs/rest";
import {
  Routes,
  type APIMessage,
  type RESTPostAPIChannelMessageJSONBody,
} from "@discordjs/core";
import { HalloweenConfig } from "../halloween.config";

/**
 * Discord REST calls made as the Halloween bot. Separate from
 * `DiscordService`, which speaks for chardb's own application.
 *
 * Replies to commands are not sent through here: each is the response to its
 * interaction's own HTTP request.
 */
@Injectable()
export class HalloweenDiscordClient {
  private readonly rest: REST;

  constructor(config: HalloweenConfig) {
    this.rest = new REST({ version: "10" }).setToken(config.botToken);
  }

  /**
   * The server a channel is in, or null for one that is gone, that the bot
   * cannot see, or that is in no server at all.
   */
  async channelGuildId(channelId: string): Promise<string | null> {
    try {
      const channel = (await this.rest.get(Routes.channel(channelId))) as {
        guild_id?: string;
      };
      return channel.guild_id ?? null;
    } catch (error) {
      if (
        error instanceof DiscordAPIError &&
        (error.status === 404 || error.status === 403)
      ) {
        return null;
      }
      throw error;
    }
  }

  async createChannelMessage(
    channelId: string,
    body: RESTPostAPIChannelMessageJSONBody,
  ): Promise<APIMessage> {
    return (await this.rest.post(Routes.channelMessages(channelId), {
      body,
    })) as APIMessage;
  }
}
