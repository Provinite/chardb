import { DiscordAPIError, HTTPError } from "@discordjs/rest";
import { HalloweenDiscordClient } from "./halloween-discord.client";
import { DiscordWebhookMessageUnavailableError } from "../errors";
import { HalloweenConfig } from "../halloween.config";
import { testConfig } from "../testing/fixtures";

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockPost = jest.fn();
const mockSetToken = jest.fn();

jest.mock("@discordjs/rest", () => {
  const actual = jest.requireActual("@discordjs/rest");
  return {
    ...actual,
    REST: jest.fn().mockImplementation(() => {
      const instance = {
        get: mockGet,
        patch: mockPatch,
        post: mockPost,
        setToken: mockSetToken,
      };
      mockSetToken.mockReturnValue(instance);
      return instance;
    }),
  };
});

// Routes percent-encodes the "@", as discord.js's own interactions API does.
const ORIGINAL_RESPONSE_ROUTE =
  "/webhooks/896600597053202462/tok/messages/%40original";

describe("HalloweenDiscordClient", () => {
  let client: HalloweenDiscordClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new HalloweenDiscordClient(testConfig() as HalloweenConfig);
  });

  it("authenticates as the Halloween bot", () => {
    expect(mockSetToken).toHaveBeenCalledWith("test-halloween-bot-token");
  });

  it("edits the deferred reply through the interaction webhook", async () => {
    mockPatch.mockResolvedValue({ id: "m1" });
    await client.editOriginalResponse("tok", { content: "hi" });
    expect(mockPatch).toHaveBeenCalledWith(
      ORIGINAL_RESPONSE_ROUTE,
      { body: { content: "hi" }, auth: false },
    );
  });

  it("fetches the deferred reply", async () => {
    mockGet.mockResolvedValue({ id: "m1" });
    await expect(client.getOriginalResponse("tok")).resolves.toEqual({
      id: "m1",
    });
    expect(mockGet).toHaveBeenCalledWith(
      ORIGINAL_RESPONSE_ROUTE,
      { auth: false },
    );
  });

  it("reports a missing deferred reply as unavailable", async () => {
    mockGet.mockRejectedValue(
      new DiscordAPIError(
        { code: 10008, message: "Unknown Message" },
        10008,
        404,
        "GET",
        "/webhooks/x",
        {},
      ),
    );
    await expect(client.getOriginalResponse("tok")).rejects.toBeInstanceOf(
      DiscordWebhookMessageUnavailableError,
    );
  });

  it("reports any HTTP failure fetching the reply as unavailable", async () => {
    mockGet.mockRejectedValue(new HTTPError(502, "Bad Gateway", "GET", "/x", {}));
    await expect(client.getOriginalResponse("tok")).rejects.toBeInstanceOf(
      DiscordWebhookMessageUnavailableError,
    );
  });

  it("passes other failures through", async () => {
    const boom = new Error("socket hang up");
    mockGet.mockRejectedValue(boom);
    await expect(client.getOriginalResponse("tok")).rejects.toBe(boom);
  });

  it("posts to a channel as the bot", async () => {
    mockPost.mockResolvedValue({ id: "m2" });
    await client.createChannelMessage("chan", { content: "Test message" });
    expect(mockPost).toHaveBeenCalledWith("/channels/chan/messages", {
      body: { content: "Test message" },
    });
  });
});
