import {
  ApplicationCommandType,
  PermissionFlagsBits,
  type APIApplicationCommandGuildInteraction,
  type APIChatInputApplicationCommandGuildInteraction,
  type APIUserApplicationCommandGuildInteraction,
} from "@discordjs/core";
import { HalloweenDiscordError } from "../errors";

export function isChatInput(
  interaction: APIApplicationCommandGuildInteraction,
): interaction is APIChatInputApplicationCommandGuildInteraction {
  return interaction.data.type === ApplicationCommandType.ChatInput;
}

export function isUserCommand(
  interaction: APIApplicationCommandGuildInteraction,
): interaction is APIUserApplicationCommandGuildInteraction {
  return interaction.data.type === ApplicationCommandType.User;
}

/** Narrows to a slash command, which every command but gifty requires. */
export function requireChatInput(
  interaction: APIApplicationCommandGuildInteraction,
): APIChatInputApplicationCommandGuildInteraction {
  if (!isChatInput(interaction)) {
    throw new HalloweenDiscordError({
      thrownFrom: "requireChatInput",
      message: `Something went wrong while handling your interaction. ERR_UNEXPECTED_INTERACTION_KIND`,
      sourceError: new Error(
        `Received unexpected command in ${interaction.data.name} chat command handler. Expected a guild chat command, but got something else.`,
      ),
    });
  }
  return interaction;
}

/** Whether the member holds Discord's Administrator permission in the guild. */
export function isAdministrator(
  interaction: APIApplicationCommandGuildInteraction,
): boolean {
  const required = PermissionFlagsBits.Administrator;
  return (BigInt(interaction.member.permissions) & required) === required;
}

export function requireAdministrator(
  interaction: APIApplicationCommandGuildInteraction,
  thrownFrom: string,
  message = "You lack the required permissions for that command.",
): void {
  if (!isAdministrator(interaction)) {
    throw new HalloweenDiscordError({
      thrownFrom,
      message,
      sourceError: new Error(
        `Invalid permissions when attempting to process command ${interaction.data.name}`,
      ),
    });
  }
}
