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
import { HalloweenCommandDispatcher } from "./halloween-command.dispatcher";
import { verifyDiscordSignature } from "./verify-signature";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";

/** Commands whose reply only the player who ran them can see. */
const PRIVATE_COMMANDS = new Set(["deviantart"]);

/**
 * The Halloween bot's Interactions Endpoint URL. Discord POSTs every slash
 * command here and expects an answer within three seconds, so a command is
 * only acknowledged here -- a deferred "thinking..." reply -- and runs after
 * the response has gone.
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
    private readonly dispatcher: HalloweenCommandDispatcher,
  ) {}

  @Post("interactions")
  @HttpCode(HttpStatus.OK)
  interactions(
    @Req() req: RawBodyRequest<Request>,
    @Res({ passthrough: true }) res: Response,
  ): APIInteractionResponse {
    const verified =
      req.rawBody !== undefined &&
      verifyDiscordSignature(
        this.config.publicKey,
        req.header("X-Signature-Timestamp"),
        req.rawBody,
        req.header("X-Signature-Ed25519"),
      );
    if (!verified) {
      // Discord sends some of these on purpose when the endpoint URL is
      // saved, to check they are refused; a steady stream means a key is wrong.
      this.logger.warn({
        event: HalloweenLogEvent.InteractionRejected,
        message: "Refused an interaction with an invalid signature",
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
        message: `Refused interaction of unsupported type ${interaction.type}`,
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
        message: `Refused /${interaction.data.name} outside a server`,
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
    this.logger.log({
      event: HalloweenLogEvent.InteractionReceived,
      message: `Received /${guildInteraction.data.name}`,
      interactionId: guildInteraction.id,
      command: guildInteraction.data.name,
      guildId: guildInteraction.guild_id,
      userId: guildInteraction.member.user.id,
    } satisfies HalloweenLogLine);
    // Not before: editing the deferred reply needs Discord to have it first.
    res.on("finish", () => {
      void this.dispatcher
        .dispatch(guildInteraction)
        .catch((error: unknown) =>
          this.logger.error(
            `Dispatch of interaction ${guildInteraction.id} escaped its handler`,
            error instanceof Error ? error.stack : String(error),
          ),
        );
    });

    return {
      type: InteractionResponseType.DeferredChannelMessageWithSource,
      data: {
        flags: PRIVATE_COMMANDS.has(guildInteraction.data.name.toLowerCase())
          ? MessageFlags.Ephemeral
          : undefined,
      },
    };
  }
}
