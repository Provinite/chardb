import {
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  type RawBodyRequest,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { SKIP_ALL_THROTTLES } from "../../middleware/throttles";
import type { Request, Response } from "express";
import {
  InteractionResponseType,
  InteractionType,
  MessageFlags,
  type APIApplicationCommandGuildInteraction,
  type APIInteraction,
  type APIInteractionResponse,
} from "@discordjs/core";
import { AllowUnauthenticated } from "../../auth/decorators/AllowUnauthenticated";
import { HalloweenConfig } from "../halloween.config";
import {
  HalloweenCommandDispatcher,
  type DispatchedCommand,
} from "./halloween-command.dispatcher";
import {
  verifyDiscordSignature,
  type SignatureCheck,
} from "./verify-signature";
import { Clock } from "../../clock/clock";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";

/**
 * The Halloween bot's Interactions Endpoint URL. Discord POSTs every slash
 * command here and expects the answer within three seconds, so the command
 * runs here and its reply is the response. Anything it leaves for later --
 * announcing a win, delivering a prize -- runs once the response has gone.
 *
 * Discord does not confirm it showed the reply. If the connection closes
 * before the response goes out, that is logged as `reply_not_sent`.
 *
 * Unauthenticated and unthrottled: the Ed25519 signature is the
 * authentication, and every player's knock arrives from the same few Discord
 * addresses, which an IP rate limit would choke during the event.
 */
@Controller("discord/halloween")
@AllowUnauthenticated()
@SkipThrottle(SKIP_ALL_THROTTLES)
export class HalloweenInteractionsController {
  private readonly logger = new Logger(HalloweenInteractionsController.name);

  constructor(
    private readonly config: HalloweenConfig,
    private readonly clock: Clock,
    private readonly dispatcher: HalloweenCommandDispatcher,
  ) {}

  @Post("interactions")
  @HttpCode(HttpStatus.OK)
  async interactions(
    @Req() req: RawBodyRequest<Request>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<APIInteractionResponse> {
    const check: SignatureCheck =
      req.rawBody === undefined
        ? { ok: false, reason: "missing_headers" }
        : verifyDiscordSignature(
            this.config.publicKey,
            req.header("X-Signature-Timestamp"),
            req.rawBody,
            req.header("X-Signature-Ed25519"),
            this.clock.now(),
          );
    if (!check.ok) {
      // Discord sends some bad signatures on purpose when the endpoint URL
      // is saved, to check they are refused; a steady stream of
      // bad_signature means the key is wrong, and stale_timestamp means a
      // replay or a badly skewed clock.
      this.logger.warn({
        event: HalloweenLogEvent.InteractionRejected,
        message: "Refused an interaction that failed the signature check",
        reason: check.reason,
        hasSignature: Boolean(req.header("X-Signature-Ed25519")),
        hasTimestamp: Boolean(req.header("X-Signature-Timestamp")),
        hasRawBody: req.rawBody !== undefined,
        ip: req.ip,
      } satisfies HalloweenLogLine);
      throw new HttpException(
        { error: { message: "Invalid request, invalid request signature" } },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const interaction = req.body as APIInteraction;

    if (interaction.type === InteractionType.Ping) {
      this.logger.log({
        event: HalloweenLogEvent.Ping,
        message: "Answered Discord's PING",
      } satisfies HalloweenLogLine);
      return { type: InteractionResponseType.Pong };
    }

    if (interaction.type !== InteractionType.ApplicationCommand) {
      this.logger.warn({
        event: HalloweenLogEvent.UnsupportedInteraction,
        message: "Refused an interaction of an unsupported type",
        interactionId: interaction.id,
        interactionType: interaction.type,
      } satisfies HalloweenLogLine);
      throw new HttpException(
        {
          error: {
            message: "Bad request, only application commands are supported.",
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!interaction.guild_id) {
      this.logger.log({
        event: HalloweenLogEvent.NotInGuild,
        message: "Refused a command used outside a server",
        interactionId: interaction.id,
        command: interaction.data.name,
        userId: interaction.user?.id ?? interaction.member?.user.id,
      } satisfies HalloweenLogLine);
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.Ephemeral,
          content: "This command may only be used in a guild.",
        },
      };
    }

    const guildInteraction =
      interaction as APIApplicationCommandGuildInteraction;
    const command = guildInteraction.data.name.toLowerCase();
    this.logger.log({
      event: HalloweenLogEvent.InteractionReceived,
      message: "Received a command",
      interactionId: guildInteraction.id,
      command,
      guildId: guildInteraction.guild_id,
      userId: guildInteraction.member.user.id,
    } satisfies HalloweenLogLine);

    // Listening before the command runs: Discord can give up and close the
    // connection while it is still running.
    const started = Date.now();
    let dispatched: DispatchedCommand | null = null;
    let lost = false;
    let finishedUp = false;
    const finishUp = () => {
      if (finishedUp || !dispatched) return;
      finishedUp = true;
      void dispatched.afterReply();
    };
    const reportLost = (done: DispatchedCommand) => {
      this.logger.error({
        event: HalloweenLogEvent.ReplyNotSent,
        message: "A command's reply never reached Discord",
        interactionId: guildInteraction.id,
        command,
        guildId: guildInteraction.guild_id,
        userId: guildInteraction.member.user.id,
        outcome: done.outcome,
        replyTitle: done.reply.embeds?.[0]?.title ?? done.reply.content ?? null,
        durationMs: Date.now() - started,
      } satisfies HalloweenLogLine);
    };
    res.on("finish", finishUp);
    res.on("close", () => {
      if (res.writableFinished) return;
      lost = true;
      if (dispatched) {
        reportLost(dispatched);
        finishUp();
      }
    });

    dispatched = await this.dispatcher.dispatch(guildInteraction);
    if (lost) {
      reportLost(dispatched);
      finishUp();
    }
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: dispatched.reply,
    };
  }
}
