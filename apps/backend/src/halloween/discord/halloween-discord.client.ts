import { Injectable } from "@nestjs/common";
import { REST } from "@discordjs/rest";
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

  async createChannelMessage(
    channelId: string,
    body: RESTPostAPIChannelMessageJSONBody,
  ): Promise<APIMessage> {
    return (await this.rest.post(Routes.channelMessages(channelId), {
      body,
    })) as APIMessage;
  }
}
