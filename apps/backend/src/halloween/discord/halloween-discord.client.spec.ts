import { HalloweenDiscordClient } from "./halloween-discord.client";
import { HalloweenConfig } from "../halloween.config";
import { testConfig } from "../testing/fixtures";

const mockPost = jest.fn();
const mockSetToken = jest.fn();

jest.mock("@discordjs/rest", () => {
  const actual = jest.requireActual("@discordjs/rest");
  return {
    ...actual,
    REST: jest.fn().mockImplementation(() => {
      const instance = { post: mockPost, setToken: mockSetToken };
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

  it("posts to a channel as the bot", async () => {
    mockPost.mockResolvedValue({ id: "m2" });
    await client.createChannelMessage("chan", { content: "Test message" });
    expect(mockPost).toHaveBeenCalledWith("/channels/chan/messages", {
      body: { content: "Test message" },
    });
  });
});
