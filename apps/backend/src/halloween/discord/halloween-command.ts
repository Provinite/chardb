import type { APIApplicationCommandGuildInteraction } from "@discordjs/core";

/** Injection token for every registered command handler. */
export const HALLOWEEN_COMMANDS = Symbol("HALLOWEEN_COMMANDS");

/**
 * One slash (or user) command. By the time `handle` runs, Discord is showing
 * the player a deferred "thinking..." reply; the handler's job is to edit it
 * into the answer. Throwing a `DiscordReportableError` edits it into that
 * error instead.
 */
export interface HalloweenCommandHandler {
  /** The command's name as registered with Discord, lowercase. */
  readonly name: string;
  handle(interaction: APIApplicationCommandGuildInteraction): Promise<void>;
}
