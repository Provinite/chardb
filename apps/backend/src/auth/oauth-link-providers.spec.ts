import {
  DEVIANTART,
  DISCORD,
  OAuthLinkProviderConfig,
  PATREON,
  TOYHOUSE,
} from "./oauth-link-providers";

/**
 * Each provider's identity fetch: the one part of linking that differs per
 * provider, since every API answers "who is this?" in its own shape.
 */

const ok = (body: unknown) =>
  ({ ok: true, json: async () => body }) as Response;

let mockFetch: jest.SpyInstance;

beforeEach(() => {
  mockFetch = jest.spyOn(global, "fetch");
});

afterEach(() => {
  mockFetch.mockRestore();
});

describe.each<[string, OAuthLinkProviderConfig]>([
  ["Discord", DISCORD],
  ["DeviantArt", DEVIANTART],
  ["ToyHouse", TOYHOUSE],
  ["Patreon", PATREON],
])("%s identity fetch, failures", (label, config) => {
  it("throws when the API response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    await expect(config.fetchIdentity("token-abc")).rejects.toThrow(
      `Failed to fetch ${label} user profile`,
    );
  });

  it("throws when the response carries no identity", async () => {
    mockFetch.mockResolvedValueOnce(ok({}));

    await expect(config.fetchIdentity("token-abc")).rejects.toThrow(
      /unexpected response shape/i,
    );
  });

  it("passes on a network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network failure"));

    await expect(config.fetchIdentity("token-abc")).rejects.toThrow(
      "network failure",
    );
  });

  it("sends the access token as a bearer token", async () => {
    mockFetch.mockResolvedValueOnce(ok({}));

    await config.fetchIdentity("token-abc").catch(() => undefined);

    expect(mockFetch.mock.calls[0][1]).toEqual({
      headers: { Authorization: "Bearer token-abc" },
    });
  });
});

describe("Discord identity", () => {
  it("prefers the global display name", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({
        id: "1",
        username: "cool",
        discriminator: "0",
        global_name: "Cool",
      }),
    );

    await expect(DISCORD.fetchIdentity("t")).resolves.toEqual({
      providerAccountId: "1",
      displayName: "Cool",
    });
  });

  it("uses name#1234 for an account that still has a discriminator", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ id: "1", username: "cool", discriminator: "1234" }),
    );

    await expect(DISCORD.fetchIdentity("t")).resolves.toEqual({
      providerAccountId: "1",
      displayName: "cool#1234",
    });
  });

  it("uses @username otherwise", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ id: "1", username: "cool", discriminator: "0" }),
    );

    await expect(DISCORD.fetchIdentity("t")).resolves.toEqual({
      providerAccountId: "1",
      displayName: "@cool",
    });
  });
});

describe("DeviantArt identity", () => {
  it("links the account's UUID under its username", async () => {
    mockFetch.mockResolvedValueOnce(ok({ userid: "uuid-1", username: "cool" }));

    await expect(DEVIANTART.fetchIdentity("t")).resolves.toEqual({
      providerAccountId: "uuid-1",
      displayName: "cool",
    });
  });
});

describe("ToyHouse identity", () => {
  it("stringifies the numeric id", async () => {
    mockFetch.mockResolvedValueOnce(ok({ id: 12345, username: "cooluser" }));

    await expect(TOYHOUSE.fetchIdentity("t")).resolves.toEqual({
      providerAccountId: "12345",
      displayName: "cooluser",
    });
  });

  it("rejects a response missing the username", async () => {
    mockFetch.mockResolvedValueOnce(ok({ id: 99 }));

    await expect(TOYHOUSE.fetchIdentity("t")).rejects.toThrow(
      /unexpected response shape/i,
    );
  });
});

describe("Patreon identity", () => {
  const identity = (attributes: Record<string, unknown>, id: unknown = "123") =>
    ok({ data: { id, type: "user", attributes } });

  it("uses the vanity handle as the display name when set", async () => {
    mockFetch.mockResolvedValueOnce(
      identity({ vanity: "cooluser", full_name: "Cool User" }),
    );

    await expect(PATREON.fetchIdentity("t")).resolves.toEqual({
      providerAccountId: "123",
      displayName: "cooluser",
    });
  });

  it("falls back to the full name when there is no vanity handle", async () => {
    mockFetch.mockResolvedValueOnce(
      identity({ vanity: null, full_name: "Cool User" }),
    );

    await expect(PATREON.fetchIdentity("t")).resolves.toEqual({
      providerAccountId: "123",
      displayName: "Cool User",
    });
  });

  it("truncates a display name longer than the column allows", async () => {
    mockFetch.mockResolvedValueOnce(identity({ full_name: "x".repeat(150) }));

    const { displayName } = await PATREON.fetchIdentity("t");
    expect(displayName).toHaveLength(100);
  });

  it("asks for the attributes it reads", async () => {
    mockFetch.mockResolvedValueOnce(identity({ vanity: "cooluser" }));

    await PATREON.fetchIdentity("t");

    const url = new URL(mockFetch.mock.calls[0][0] as string);
    expect(url.searchParams.get("fields[user]")).toBe("full_name,vanity");
  });

  it("rejects a response with no id", async () => {
    mockFetch.mockResolvedValueOnce(identity({ vanity: "cooluser" }, null));

    await expect(PATREON.fetchIdentity("t")).rejects.toThrow(
      /unexpected response shape/i,
    );
  });
});
