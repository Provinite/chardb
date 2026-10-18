import { Injectable, Logger } from "@nestjs/common";
import type { APIApplicationCommandGuildInteraction } from "@discordjs/core";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import type {
  HalloweenCommandHandler,
  HalloweenCommandResult,
} from "../discord/halloween-command";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { GuildSettingsService } from "../services/guild-settings.service";
import { requireAdministrator, requireChatInput } from "./command-helpers";

/**
 * `/testwin`: checks the bot can post in the win channel. The post comes
 * before the reply, since whether it worked is the answer.
 */
@Injectable()
export class TestWinCommand implements HalloweenCommandHandler {
  readonly name = "testwin";
  private readonly logger = new Logger(TestWinCommand.name);

  constructor(
    private readonly discord: HalloweenDiscordClient,
    private readonly guildSettings: GuildSettingsService,
  ) {}

  async handle(
    interaction: APIApplicationCommandGuildInteraction,
  ): Promise<HalloweenCommandResult> {
    const chat = requireChatInput(interaction);
    requireAdministrator(
      chat,
      "TestWinCommand",
      "You are missing the required permissions to use this command",
    );
    const settings = await this.guildSettings.get(chat.guild_id);
    this.logger.log({
      event: HalloweenLogEvent.WinChannelTested,
      message: settings.winChannel
        ? `Posting a test message to win channel ${settings.winChannel}`
        : "Win channel test: no win channel set",
      interactionId: chat.id,
      guildId: chat.guild_id,
      adminUserId: chat.member.user.id,
      winChannel: settings.winChannel,
      sent: settings.winChannel !== null,
    } satisfies HalloweenLogLine);
    if (!settings.winChannel) {
      return { reply: { content: "Win channel isn't set." } };
    }
    await this.discord.createChannelMessage(settings.winChannel, {
      content: "Test message",
    });
    return { reply: { content: "Sent test message." } };
  }
}
