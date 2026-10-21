import { HalloweenDiscordClient } from "./halloween-discord.client";
import { HalloweenConfig } from "../halloween.config";
import { testConfig } from "../testing/fixtures";

import { DiscordAPIError } from "@discordjs/rest";

const mockPost = jest.fn();
const mockGet = jest.fn();
const mockSetToken = jest.fn();

jest.mock("@discordjs/rest", () => {
  const actual = jest.requireActual("@discordjs/rest");
  return {
    ...actual,
    REST: jest.fn().mockImplementation(() => {
      const instance = {
        post: mockPost,
        get: mockGet,
        setToken: mockSetToken,
      };
      mockSetToken.mockReturnValue(instance);
      return instance;
    }),
  };
});

describe("HalloweenDiscordClient", () => {
  let client: HalloweenDiscordClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new HalloweenDiscordClient(testConfig() as HalloweenConfig);
  });

  it("authenticates as the Halloween bot", () => {
    expect(mockSetToken).toHaveBeenCalledWith("test-halloween-bot-token");
  });

  describe("channelGuildId", () => {
    const refused = (status: number) =>
      new DiscordAPIError(
        { code: 0, message: "refused" },
        0,
        status,
        "GET",
        "/channels/chan",
        {},
      );

    it("says which server a channel is in", async () => {
      mockGet.mockResolvedValue({ id: "chan", guild_id: "g-1" });
      await expect(client.channelGuildId("chan")).resolves.toBe("g-1");
      expect(mockGet).toHaveBeenCalledWith("/channels/chan");
    });

    it("knows none for a channel that is gone, or that the bot cannot see", async () => {
      mockGet.mockRejectedValueOnce(refused(404));
      await expect(client.channelGuildId("chan")).resolves.toBeNull();
      mockGet.mockRejectedValueOnce(refused(403));
      await expect(client.channelGuildId("chan")).resolves.toBeNull();
    });

    it("knows none for a channel outside any server, like a DM", async () => {
      mockGet.mockResolvedValue({ id: "chan" });
      await expect(client.channelGuildId("chan")).resolves.toBeNull();
    });

    it("passes on any other failure", async () => {
      const outage = refused(503);
      mockGet.mockRejectedValue(outage);
      await expect(client.channelGuildId("chan")).rejects.toBe(outage);
    });
  });

  it("posts to a channel as the bot", async () => {
    mockPost.mockResolvedValue({ id: "m2" });
    await client.createChannelMessage("chan", { content: "Test message" });
    expect(mockPost).toHaveBeenCalledWith("/channels/chan/messages", {
      body: { content: "Test message" },
    });
  });
});
