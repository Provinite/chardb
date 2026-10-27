import type { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import type { HalloweenUi } from "../discord/ui";
import { ConfigService } from "@nestjs/config";
import { HalloweenLinks } from "../halloween-links";
import type { DatabaseService } from "../../database/database.service";
import { GUILD_ID } from "./fixtures";

export const AUTHOR = {
  name: "Daphne",
  icon_url: "https://images.test/halloween/icon/0.png",
};
export const TIMESTAMP = "2025-10-17T15:30:00.000Z";
export const CANDY = "https://images.test/halloween/candy/candy-corn.png";

/** Deterministic stand-ins for the embed pieces that are random or timed. */
export function stubUi(now = new Date(TIMESTAMP)): HalloweenUi {
  return {
    author: () => AUTHOR,
    timestamp: () => TIMESTAMP,
    now: () => now,
    candyImageUrl: () => CANDY,
    errorFooter: (i: { id: string }) => ({ text: `Reference ID: ${i.id}` }),
  } as unknown as HalloweenUi;
}

/**
 * The real links, for a guild linked to the community `slug` on chardb.cc,
 * so a spec sees the URLs players would.
 */
export function linksFor(slug: string): HalloweenLinks {
  return new HalloweenLinks(
    new ConfigService({
      FRONTEND_URL: "https://chardb.cc",
      ROOT_DOMAIN: "chardb.cc",
    }),
    {
      community: { findFirst: () => Promise.resolve({ slug }) },
    } as unknown as DatabaseService,
  );
}

export type DiscordMock = {
  createChannelMessage: jest.Mock;
  channelGuildId: jest.Mock;
};

/** The bot's Discord calls; every channel is in the fixtures' guild. */
export function mockDiscord(): DiscordMock & HalloweenDiscordClient {
  return {
    createChannelMessage: jest.fn().mockResolvedValue({ id: "message" }),
    channelGuildId: jest.fn().mockResolvedValue(GUILD_ID),
  } as unknown as DiscordMock & HalloweenDiscordClient;
}
