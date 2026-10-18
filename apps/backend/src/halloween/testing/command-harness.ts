import type { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import type { HalloweenUi } from "../discord/ui";

export const AUTHOR = {
  name: "Daphne",
  icon_url: "https://images.test/halloween/icon/0.png",
};
export const TIMESTAMP = "2025-10-17T15:30:00.000Z";
export const CANDY = "https://images.test/halloween/candy/7.png";

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

export type DiscordMock = {
  [K in
    | "editOriginalResponse"
    | "createChannelMessage"
    | "getOriginalResponse"]: jest.Mock;
};

export function mockDiscord(): DiscordMock & HalloweenDiscordClient {
  return {
    editOriginalResponse: jest.fn().mockResolvedValue({ id: "message" }),
    createChannelMessage: jest.fn().mockResolvedValue({ id: "message" }),
    getOriginalResponse: jest.fn().mockResolvedValue({ id: "message" }),
  } as unknown as DiscordMock & HalloweenDiscordClient;
}

/** The body the command edited the deferred reply into. */
export function lastReply(discord: DiscordMock): unknown {
  const calls = discord.editOriginalResponse.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][1];
}
