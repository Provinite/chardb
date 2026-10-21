import { Inject, Injectable, Logger } from "@nestjs/common";
import type { APIApplicationCommandGuildInteraction } from "@discordjs/core";
import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import {
  HALLOWEEN_COMMANDS,
  HalloweenCommandHandler,
  type HalloweenCommandResult,
  type HalloweenReply,
} from "./halloween-command";
import { HalloweenUi } from "./ui";
import { DiscordReportableError, HalloweenDiscordError } from "../errors";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";

const stackOf = (error: unknown): string =>
  error instanceof Error ? (error.stack ?? error.message) : String(error);

/**
 * How a command ended. `refused` is an expected no -- out of knocks, event
 * over -- and `failed` is a fault.
 */
export type Outcome = "ok" | "refused" | "failed";

/** A command that has run: the reply to send, and what is left after it. */
export interface DispatchedCommand {
  reply: HalloweenReply;
  outcome: Outcome;
  /** Never rejects; a failure is logged. */
  afterReply: () => Promise<void>;
}

/** The fields that identify a command on every line logged about it. */
interface CommandFields {
  interactionId: string;
  command: string;
  guildId: string;
  userId: string;
}

const nothingLeft = () => Promise.resolve();

/**
 * Runs a command and turns whatever it throws into a reply. The bot's
 * command Lambda, minus the queue in front of it.
 *
 * The command runs in its own trace span, tagged with who ran what; so does
 * whatever it leaves for after the reply, which runs once the HTTP response
 * that carried the command has finished.
 */
@Injectable()
export class HalloweenCommandDispatcher {
  private readonly logger = new Logger(HalloweenCommandDispatcher.name);
  private readonly tracer = trace.getTracer("chardb-halloween", "1.0.0");
  private readonly commands: Map<string, HalloweenCommandHandler>;

  constructor(
    @Inject(HALLOWEEN_COMMANDS) commands: HalloweenCommandHandler[],
    private readonly ui: HalloweenUi,
  ) {
    this.commands = new Map(commands.map((c) => [c.name, c]));
  }

  /** Never rejects: a failure becomes the reply. */
  async dispatch(
    interaction: APIApplicationCommandGuildInteraction,
  ): Promise<DispatchedCommand> {
    const fields: CommandFields = {
      interactionId: interaction.id,
      command: interaction.data.name.toLowerCase(),
      guildId: interaction.guild_id,
      userId: interaction.member.user.id,
    };
    const attributes = {
      "halloween.interaction_id": fields.interactionId,
      "halloween.command": fields.command,
      "halloween.guild_id": fields.guildId,
      "halloween.user_id": fields.userId,
    };
    const { result, outcome } = await this.tracer.startActiveSpan(
      `halloween.command ${fields.command}`,
      { kind: SpanKind.INTERNAL, attributes },
      async (span) => {
        const ran = await this.run(interaction, fields);
        span.setAttributes({ "halloween.outcome": ran.outcome });
        span.setStatus({
          code:
            ran.outcome === "failed" ? SpanStatusCode.ERROR : SpanStatusCode.OK,
        });
        span.end();
        return ran;
      },
    );

    const later = result.afterReply;
    return {
      reply: result.reply,
      outcome,
      afterReply: later
        ? () =>
            this.tracer.startActiveSpan(
              `halloween.after_reply ${fields.command}`,
              { kind: SpanKind.INTERNAL, attributes },
              async (span) => {
                try {
                  await later();
                  span.setStatus({ code: SpanStatusCode.OK });
                } catch (error) {
                  span.setStatus({ code: SpanStatusCode.ERROR });
                  this.logger.error(
                    {
                      event: HalloweenLogEvent.AfterReplyFailed,
                      message: "Work after a command's reply failed",
                      ...fields,
                      cause:
                        error instanceof Error ? error.message : String(error),
                    } satisfies HalloweenLogLine,
                    stackOf(error),
                  );
                } finally {
                  span.end();
                }
              },
            )
        : nothingLeft,
    };
  }

  private async run(
    interaction: APIApplicationCommandGuildInteraction,
    fields: CommandFields,
  ): Promise<{ result: HalloweenCommandResult; outcome: Outcome }> {
    const started = Date.now();
    const completed = (outcome: Outcome, message: string) => ({
      event: HalloweenLogEvent.CommandCompleted,
      message,
      ...fields,
      outcome,
      durationMs: Date.now() - started,
    });

    try {
      const command = this.commands.get(fields.command);
      if (!command) {
        throw new HalloweenDiscordError({
          thrownFrom: "HalloweenCommandDispatcher",
          message: "Unknown command, use /help for details",
          // The command's name is on every line logged about it.
          sourceError: new Error("Unknown command"),
        });
      }
      const result = await command.handle(interaction);
      this.logger.log(completed("ok", "Command succeeded"));
      return { result, outcome: "ok" };
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
        ...(reportable.details ? { errorDetails: reportable.details } : {}),
      };

      let outcome: Outcome;
      if (reportable.logAsError) {
        outcome = "failed";
        const cause = reportable === error ? reportable.sourceError : error;
        this.logger.error(
          {
            // `reason` says why.
            ...completed(outcome, "Command failed"),
            ...details,
            cause: cause instanceof Error ? cause.message : reportable.message,
          },
          stackOf(cause ?? reportable),
        );
      } else {
        outcome = "refused";
        this.logger.warn({
          ...completed(outcome, "Command refused"),
          ...details,
        });
      }

      return {
        result: { reply: reportable.responseBody(interaction, this.ui) },
        outcome,
      };
    }
  }
}
