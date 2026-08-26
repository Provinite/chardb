import { ConfigService } from "@nestjs/config";
import { ToyhouseStrategy } from "./toyhouse.strategy";

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

function makeStrategy(): ToyhouseStrategy {
  const config = {
    get: (key: string) => {
      const vals: Record<string, string> = {
        TOYHOUSE_CLIENT_ID: "test-id",
        TOYHOUSE_CLIENT_SECRET: "test-secret",
        TOYHOUSE_CALLBACK_URL: "http://localhost:4000/auth/toyhouse/callback",
      };
      return vals[key];
    },
  } as unknown as ConfigService;
  return new ToyhouseStrategy(config);
}

describe("ToyhouseStrategy.fetchUserProfile", () => {
  let strategy: ToyhouseStrategy;
  let mockFetch: jest.SpyInstance;

  beforeEach(() => {
    strategy = makeStrategy();
    mockFetch = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  it("calls done with the profile when the API returns valid data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 12345, username: "cooluser" }),
    } as Response);

    const done = jest.fn();
    await strategy.fetchUserProfile("token-abc", done);

    expect(done).toHaveBeenCalledWith(null, { id: "12345", username: "cooluser" });
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
      "Failed to fetch ToyHouse user profile",
    );
  });

  it("calls done with an error when the response is missing id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ username: "cooluser" }), // no id
    } as Response);

    const done = jest.fn();
    await strategy.fetchUserProfile("token-abc", done);

    expect(done).toHaveBeenCalledWith(expect.any(Error));
    expect((done.mock.calls[0][0] as Error).message).toMatch(
      /unexpected response shape/i,
    );
  });

  it("calls done with an error when the response is missing username", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 99 }), // no username
    } as Response);

    const done = jest.fn();
    await strategy.fetchUserProfile("token-abc", done);

    expect(done).toHaveBeenCalledWith(expect.any(Error));
    expect((done.mock.calls[0][0] as Error).message).toMatch(
      /unexpected response shape/i,
    );
  });

  it("does not produce the string \"undefined\" as providerAccountId when id is absent", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ username: "cooluser" }), // id missing
    } as Response);

    const done = jest.fn();
    await strategy.fetchUserProfile("token-abc", done);

    // Ensure the profile was NOT called with id="undefined"
    const profileArg = done.mock.calls[0][1];
    expect(profileArg?.id).not.toBe("undefined");
  });

  it("calls done with an error when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network failure"));

    const done = jest.fn();
    await strategy.fetchUserProfile("token-abc", done);

    expect(done).toHaveBeenCalledWith(expect.any(Error));
    expect((done.mock.calls[0][0] as Error).message).toBe("network failure");
  });
});
