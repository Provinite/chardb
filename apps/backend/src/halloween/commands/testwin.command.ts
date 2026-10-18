import { Injectable } from "@nestjs/common";
import type { APIApplicationCommandGuildInteraction } from "@discordjs/core";
import type { HalloweenCommandHandler } from "../discord/halloween-command";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { GuildSettingsService } from "../services/guild-settings.service";
import { requireAdministrator, requireChatInput } from "./command-helpers";

/** `/testwin`: checks the bot can post in the win channel. */
@Injectable()
export class TestWinCommand implements HalloweenCommandHandler {
  readonly name = "testwin";

  constructor(
    private readonly discord: HalloweenDiscordClient,
    private readonly guildSettings: GuildSettingsService,
  ) {}

  async handle(interaction: APIApplicationCommandGuildInteraction): Promise<void> {
    const chat = requireChatInput(interaction);
    requireAdministrator(
      chat,
      "TestWinCommand",
      "You are missing the required permissions to use this command",
    );
    const settings = await this.guildSettings.get(chat.guild_id);
    if (settings.winChannel) {
      await this.discord.createChannelMessage(settings.winChannel, {
        content: "Test message",
      });
      await this.discord.editOriginalResponse(chat.token, {
        content: "Sent test message.",
      });
    } else {
      await this.discord.editOriginalResponse(chat.token, {
        content: "Win channel isn't set.",
      });
    }
  }
}
