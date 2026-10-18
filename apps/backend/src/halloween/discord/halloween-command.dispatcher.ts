import { Inject, Injectable, Logger } from "@nestjs/common";
import type { APIApplicationCommandGuildInteraction } from "@discordjs/core";
import { HALLOWEEN_COMMANDS, HalloweenCommandHandler } from "./halloween-command";
import { HalloweenDiscordClient } from "./halloween-discord.client";
import { HalloweenUi } from "./ui";
import {
  DiscordReportableError,
  DiscordWebhookMessageUnavailableError,
  HalloweenDiscordError,
} from "../errors";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs a deferred command and turns whatever it throws into a reply. The
 * bot's command Lambda, minus the queue in front of it.
 */
@Injectable()
export class HalloweenCommandDispatcher {
  private readonly logger = new Logger(HalloweenCommandDispatcher.name);
  private readonly commands: Map<string, HalloweenCommandHandler>;

  /**
   * Pauses between attempts to find the deferred reply. Editing it before
   * Discord has registered the acknowledgement 404s; the bot hit this often
   * enough to always check first, and its queue retried when the check failed.
   */
  originalResponseRetryDelaysMs = [250, 1000];

  constructor(
    @Inject(HALLOWEEN_COMMANDS) commands: HalloweenCommandHandler[],
    private readonly discord: HalloweenDiscordClient,
    private readonly ui: HalloweenUi,
  ) {
    this.commands = new Map(commands.map((c) => [c.name, c]));
  }

  /** Never rejects: there is no caller left to hear about it. */
  async dispatch(interaction: APIApplicationCommandGuildInteraction): Promise<void> {
    const commandName = interaction.data.name.toLowerCase();
    try {
      await this.waitForOriginalResponse(interaction);
    } catch (error) {
      this.logger.error(
        `Deferred reply for /${commandName} (interaction ${interaction.id}) never appeared; not running it`,
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    try {
      const command = this.commands.get(commandName);
      if (!command) {
        throw new HalloweenDiscordError({
          thrownFrom: "HalloweenCommandDispatcher",
          message: `Unknown command, use /help for details`,
          sourceError: new Error(`Unknown command: ${commandName}`),
        });
      }
      await command.handle(interaction);
    } catch (error) {
      await this.report(error, interaction, commandName);
    }
  }

  private async waitForOriginalResponse(
    interaction: APIApplicationCommandGuildInteraction,
  ): Promise<void> {
    for (const delay of [...this.originalResponseRetryDelaysMs, null]) {
      try {
        await this.discord.getOriginalResponse(interaction.token);
        return;
      } catch (error) {
        if (
          !(error instanceof DiscordWebhookMessageUnavailableError) ||
          delay === null
        ) {
          throw error;
        }
        await sleep(delay);
      }
    }
  }

  private async report(
    error: unknown,
    interaction: APIApplicationCommandGuildInteraction,
    commandName: string,
  ): Promise<void> {
    const reportable =
      error instanceof DiscordReportableError
        ? error
        : new DiscordReportableError(
            "An unknown error ocurred while processing your request",
            {
              thrownFrom: "HalloweenCommandDispatcher",
              logAsError: true,
              sourceError: error instanceof Error ? error : undefined,
            },
          );

    const context = `/${commandName} failed for user ${interaction.member.user.id} in guild ${interaction.guild_id} (interaction ${interaction.id}): ${reportable.message} [from ${reportable.thrownFrom}]`;
    if (reportable.logAsError) {
      const cause = reportable.sourceError ?? reportable;
      this.logger.error(context, error instanceof Error ? error.stack : cause.stack);
    } else {
      this.logger.warn(context);
    }

    try {
      await this.discord.editOriginalResponse(
        interaction.token,
        reportable.responseBody(interaction, this.ui),
      );
    } catch (reportError) {
      this.logger.error(
        `Could not tell the player about the failure of /${commandName} (interaction ${interaction.id})`,
        reportError instanceof Error ? reportError.stack : String(reportError),
      );
    }
  }
}
