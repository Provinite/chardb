import { ConfigService } from "@nestjs/config";
import { PatreonStrategy } from "./patreon.strategy";

// passport-oauth2 requires a concrete OAuth provider config to instantiate;
// stub it out so we can unit-test fetchUserProfile in isolation.
jest.mock("passport-oauth2", () => {
  const actual = jest.requireActual("passport-oauth2");
  return {
    ...actual,
    Strategy: class {
      constructor(_opts: unknown) {}
      authenticate() {}
    },
  };
});

function makeStrategy(): PatreonStrategy {
  const config = {
    get: (key: string) => {
      const vals: Record<string, string> = {
        PATREON_CLIENT_ID: "test-id",
        PATREON_CLIENT_SECRET: "test-secret",
        PATREON_CALLBACK_URL: "http://localhost:4000/auth/patreon/callback",
      };
      return vals[key];
    },
  } as unknown as ConfigService;
  return new PatreonStrategy(config);
}

const identity = (attributes: Record<string, unknown>, id: unknown = "123") =>
  ({
    ok: true,
    json: async () => ({ data: { id, type: "user", attributes } }),
  }) as Response;

describe("PatreonStrategy.fetchUserProfile", () => {
  let strategy: PatreonStrategy;
  let mockFetch: jest.SpyInstance;

  beforeEach(() => {
    strategy = makeStrategy();
    mockFetch = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  it("uses the vanity handle as the display name when set", async () => {
    mockFetch.mockResolvedValueOnce(
      identity({ vanity: "cooluser", full_name: "Cool User" }),
    );

    const done = jest.fn();
    await strategy.fetchUserProfile("token-abc", done);

    expect(done).toHaveBeenCalledWith(null, {
      id: "123",
      username: "cooluser",
    });
  });

  it("falls back to the full name when there is no vanity handle", async () => {
    mockFetch.mockResolvedValueOnce(
      identity({ vanity: null, full_name: "Cool User" }),
    );

    const done = jest.fn();
    await strategy.fetchUserProfile("token-abc", done);

    expect(done).toHaveBeenCalledWith(null, {
      id: "123",
      username: "Cool User",
    });
  });

  it("truncates a display name longer than the column allows", async () => {
    mockFetch.mockResolvedValueOnce(identity({ full_name: "x".repeat(150) }));

    const done = jest.fn();
    await strategy.fetchUserProfile("token-abc", done);

    expect(done.mock.calls[0][1].username).toHaveLength(100);
  });

  it("asks for the attributes it reads", async () => {
    mockFetch.mockResolvedValueOnce(identity({ vanity: "cooluser" }));

    await strategy.fetchUserProfile("token-abc", jest.fn());

    const url = new URL(mockFetch.mock.calls[0][0] as string);
    expect(url.searchParams.get("fields[user]")).toBe("full_name,vanity");
  });

  it("calls done with an error when the API response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    const done = jest.fn();
    await strategy.fetchUserProfile("token-abc", done);

    expect(done).toHaveBeenCalledWith(expect.any(Error));
    expect((done.mock.calls[0][0] as Error).message).toBe(
      "Failed to fetch Patreon user profile",
    );
  });

  it("calls done with an error when the response is missing id", async () => {
    mockFetch.mockResolvedValueOnce(identity({ vanity: "cooluser" }, null));

    const done = jest.fn();
    await strategy.fetchUserProfile("token-abc", done);

    expect(done).toHaveBeenCalledWith(expect.any(Error));
    expect((done.mock.calls[0][0] as Error).message).toMatch(
      /unexpected response shape/i,
    );
  });

  it("calls done with an error when the response has no name at all", async () => {
    mockFetch.mockResolvedValueOnce(identity({}));

    const done = jest.fn();
    await strategy.fetchUserProfile("token-abc", done);

    expect(done).toHaveBeenCalledWith(expect.any(Error));
    expect((done.mock.calls[0][0] as Error).message).toMatch(
      /unexpected response shape/i,
    );
  });

  it("calls done with an error when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network failure"));

    const done = jest.fn();
    await strategy.fetchUserProfile("token-abc", done);

    expect(done).toHaveBeenCalledWith(expect.any(Error));
    expect((done.mock.calls[0][0] as Error).message).toBe("network failure");
  });
});
