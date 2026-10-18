import { Injectable } from "@nestjs/common";
import { DiscordAPIError, HTTPError, REST } from "@discordjs/rest";
import {
  Routes,
  type APIMessage,
  type RESTPostAPIChannelMessageJSONBody,
} from "@discordjs/core";
import { HalloweenConfig } from "../halloween.config";
import {
  DiscordWebhookMessageUnavailableError,
  type InteractionResponseBody,
} from "../errors";

/**
 * Discord REST calls made as the Halloween bot. Separate from
 * `DiscordService`, which speaks for chardb's own application.
 */
@Injectable()
export class HalloweenDiscordClient {
  private readonly rest: REST;

  constructor(private readonly config: HalloweenConfig) {
    this.rest = new REST({ version: "10" }).setToken(config.botToken);
  }

  private originalResponseRoute(interactionToken: string) {
    return Routes.webhookMessage(
      this.config.applicationId,
      interactionToken,
      "@original",
    );
  }

  /**
   * The deferred reply, which only exists once Discord has registered the
   * acknowledgement. Any HTTP failure means it is not there yet.
   */
  async getOriginalResponse(interactionToken: string): Promise<APIMessage> {
    try {
      return (await this.rest.get(
        this.originalResponseRoute(interactionToken),
        {
          auth: false,
        },
      )) as APIMessage;
    } catch (error) {
      if (error instanceof DiscordAPIError || error instanceof HTTPError) {
        throw new DiscordWebhookMessageUnavailableError(interactionToken);
      }
      throw error;
    }
  }

  /** Replace the deferred "thinking..." reply with the real answer. */
  async editOriginalResponse(
    interactionToken: string,
    body: InteractionResponseBody,
  ): Promise<APIMessage> {
    return (await this.rest.patch(
      this.originalResponseRoute(interactionToken),
      {
        body,
        auth: false,
      },
    )) as APIMessage;
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
