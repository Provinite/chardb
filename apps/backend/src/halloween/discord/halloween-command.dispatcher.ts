import { Inject, Injectable, Logger } from "@nestjs/common";
import type { APIApplicationCommandGuildInteraction } from "@discordjs/core";
import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import {
  HALLOWEEN_COMMANDS,
  HalloweenCommandHandler,
} from "./halloween-command";
import { HalloweenDiscordClient } from "./halloween-discord.client";
import { HalloweenUi } from "./ui";
import {
  DiscordReportableError,
  DiscordWebhookMessageUnavailableError,
  HalloweenDiscordError,
} from "../errors";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const stackOf = (error: unknown): string =>
  error instanceof Error ? (error.stack ?? error.message) : String(error);

/**
 * How a command ended. `refused` is an expected no -- out of knocks, event
 * over -- and `failed` is a fault. `unavailable` means it never ran.
 */
type Outcome = "ok" | "refused" | "failed" | "unavailable";

/** The fields that identify a command on every line logged about it. */
interface CommandFields {
  interactionId: string;
  command: string;
  guildId: string;
  userId: string;
}

/**
 * Runs a deferred command and turns whatever it throws into a reply. The
 * bot's command Lambda, minus the queue in front of it.
 *
 * Each command runs in its own trace span, because it runs after the HTTP
 * request that carried it has finished; its database and Discord calls nest
 * under that span.
 */
@Injectable()
export class HalloweenCommandDispatcher {
  private readonly logger = new Logger(HalloweenCommandDispatcher.name);
  private readonly tracer = trace.getTracer("chardb-halloween", "1.0.0");
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
  async dispatch(
    interaction: APIApplicationCommandGuildInteraction,
  ): Promise<void> {
    const fields: CommandFields = {
      interactionId: interaction.id,
      command: interaction.data.name.toLowerCase(),
      guildId: interaction.guild_id,
      userId: interaction.member.user.id,
    };
    await this.tracer.startActiveSpan(
      `halloween.command ${fields.command}`,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          "halloween.interaction_id": fields.interactionId,
          "halloween.command": fields.command,
          "halloween.guild_id": fields.guildId,
          "halloween.user_id": fields.userId,
        },
      },
      async (span) => {
        const outcome = await this.run(interaction, fields);
        span.setAttributes({ "halloween.outcome": outcome });
        span.setStatus({
          code:
            outcome === "failed" || outcome === "unavailable"
              ? SpanStatusCode.ERROR
              : SpanStatusCode.OK,
        });
        span.end();
      },
    );
  }

  private async run(
    interaction: APIApplicationCommandGuildInteraction,
    fields: CommandFields,
  ): Promise<Outcome> {
    const started = Date.now();
    const completed = (outcome: Outcome, message: string) => ({
      event: HalloweenLogEvent.CommandCompleted,
      message,
      ...fields,
      outcome,
      durationMs: Date.now() - started,
    });

    try {
      await this.waitForOriginalResponse(interaction);
    } catch (error) {
      this.logger.error(
        {
          event: HalloweenLogEvent.ReplyUnavailable,
          message: `Deferred reply for /${fields.command} never appeared; not running it`,
          ...fields,
          attempts: this.originalResponseRetryDelaysMs.length + 1,
        } satisfies HalloweenLogLine,
        stackOf(error),
      );
      this.logger.error(
        completed("unavailable", `/${fields.command} did not run`),
      );
      return "unavailable";
    }

    try {
      const command = this.commands.get(fields.command);
      if (!command) {
        throw new HalloweenDiscordError({
          thrownFrom: "HalloweenCommandDispatcher",
          message: `Unknown command, use /help for details`,
          sourceError: new Error(`Unknown command: ${fields.command}`),
        });
      }
      await command.handle(interaction);
      this.logger.log(completed("ok", `/${fields.command} succeeded`));
      return "ok";
    } catch (error) {
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
      const details = {
        error: reportable.name,
        thrownFrom: reportable.thrownFrom,
        reason: reportable.message,
      };

      let outcome: Outcome;
      if (reportable.logAsError) {
        outcome = "failed";
        const cause = reportable === error ? reportable.sourceError : error;
        this.logger.error(
          {
            ...completed(
              outcome,
              `/${fields.command} failed: ${reportable.message}`,
            ),
            ...details,
            cause: cause instanceof Error ? cause.message : reportable.message,
          },
          stackOf(cause ?? reportable),
        );
      } else {
        outcome = "refused";
        this.logger.warn({
          ...completed(
            outcome,
            `/${fields.command} refused: ${reportable.message}`,
          ),
          ...details,
        });
      }

      await this.report(reportable, interaction, fields);
      return outcome;
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

  /** Edits the deferred reply into the error the player should see. */
  private async report(
    reportable: DiscordReportableError,
    interaction: APIApplicationCommandGuildInteraction,
    fields: CommandFields,
  ): Promise<void> {
    try {
      await this.discord.editOriginalResponse(
        interaction.token,
        reportable.responseBody(interaction, this.ui),
      );
    } catch (reportError) {
      this.logger.error(
        {
          event: HalloweenLogEvent.ReportFailed,
          message: `Could not tell the player about the failure of /${fields.command}`,
          ...fields,
        } satisfies HalloweenLogLine,
        stackOf(reportError),
      );
    }
  }
}
