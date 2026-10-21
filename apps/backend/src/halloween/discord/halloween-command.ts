import type {
  APIApplicationCommandGuildInteraction,
  APIInteractionResponseCallbackData,
} from "@discordjs/core";

/** Injection token for every registered command handler. */
export const HALLOWEEN_COMMANDS = Symbol("HALLOWEEN_COMMANDS");

/** The message a command answers with: the interaction response's data. */
export type HalloweenReply = APIInteractionResponseCallbackData;

/** What a command hands back to be sent, and anything left to do after. */
export interface HalloweenCommandResult {
  reply: HalloweenReply;
  /**
   * Work for once the reply has gone: announcing a win, delivering a prize.
   * Never inside a transaction, and never holding up the reply, which
   * Discord only waits three seconds for.
   */
  afterReply?: () => Promise<void>;
}

/**
 * One slash (or user) command. The handler works out the answer and returns
 * it; it goes back to Discord as the response to the interaction itself.
 * Throwing a `DiscordReportableError` answers with that error instead.
 */
export interface HalloweenCommandHandler {
  /** The command's name as registered with Discord, lowercase. */
  readonly name: string;
  handle(
    interaction: APIApplicationCommandGuildInteraction,
  ): Promise<HalloweenCommandResult>;
}
