import {
  APIApplicationCommandInteractionDataOption,
  APIChatInputApplicationCommandGuildInteraction,
  APIUserApplicationCommandGuildInteraction,
  ApplicationCommandType,
  InteractionType,
} from "@discordjs/core";
import type { HalloweenClock } from "../clock";
import type { HalloweenConfig } from "../halloween.config";

export const GUILD_ID = "100000000000000001";
export const USER_ID = "200000000000000001";
export const OTHER_USER_ID = "200000000000000002";
export const CHANNEL_ID = "300000000000000001";

/** Discord's ADMINISTRATOR permission bit, as the string Discord sends. */
export const ADMINISTRATOR = (1n << 3n).toString();

export function testConfig(): Pick<
  HalloweenConfig,
  "applicationId" | "publicKey" | "botToken" | "imageBaseUrl"
> {
  return {
    applicationId: "896600597053202462",
    publicKey: "ab".repeat(32),
    botToken: "test-halloween-bot-token",
    imageBaseUrl: "https://images.test/halloween/",
  };
}

export function fixedClock(iso: string): Pick<HalloweenClock, "now"> {
  return { now: () => new Date(iso) };
}

interface InteractionOverrides {
  id?: string;
  name?: string;
  options?: APIApplicationCommandInteractionDataOption[];
  userId?: string;
  guildId?: string;
  permissions?: string;
}

/**
 * A slash-command interaction as Discord posts it from a guild. Only the
 * fields the event reads are realistic; the rest are filled to satisfy the
 * type.
 */
export function buildInteraction(
  overrides: InteractionOverrides = {},
): APIChatInputApplicationCommandGuildInteraction {
  const interaction = {
    id: overrides.id ?? "400000000000000001",
    application_id: "896600597053202462",
    type: InteractionType.ApplicationCommand,
    token: "interaction-token",
    version: 1,
    guild_id: overrides.guildId ?? GUILD_ID,
    channel_id: CHANNEL_ID,
    locale: "en-US",
    app_permissions: "0",
    entitlements: [],
    authorizing_integration_owners: {},
    attachment_size_limit: 0,
    member: {
      user: {
        id: overrides.userId ?? USER_ID,
        username: "trickortreater",
        discriminator: "0",
        global_name: null,
        avatar: null,
      },
      roles: [],
      permissions: overrides.permissions ?? "0",
      joined_at: "2021-10-01T00:00:00.000Z",
      deaf: false,
      mute: false,
      flags: 0,
    },
    data: {
      id: "500000000000000001",
      name: overrides.name ?? "knock",
      type: ApplicationCommandType.ChatInput,
      ...(overrides.options ? { options: overrides.options } : {}),
    },
  };
  return interaction as unknown as APIChatInputApplicationCommandGuildInteraction;
}

/** The right-click "gifty" user command. */
export function buildUserCommandInteraction(
  overrides: Omit<InteractionOverrides, "options"> & { targetId: string },
): APIUserApplicationCommandGuildInteraction {
  const base = buildInteraction(overrides);
  return {
    ...base,
    data: {
      id: "500000000000000002",
      name: overrides.name ?? "gifty",
      type: ApplicationCommandType.User,
      target_id: overrides.targetId,
      resolved: { users: {} },
    },
  } as unknown as APIUserApplicationCommandGuildInteraction;
}
