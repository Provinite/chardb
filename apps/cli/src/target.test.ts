import { describe, expect, it } from "vitest";
import { graphqlUrl, tokenEnvironment } from "./target";

describe("tokenEnvironment", () => {
  it.each([
    ["chardb_pat_prod_abc", "prod"],
    ["chardb_pat_dev_abc", "dev"],
    ["chardb_pat_local_a_b-c", "local"],
  ])("reads %s as %s", (token, environment) => {
    expect(tokenEnvironment(token)).toBe(environment);
  });

  it.each([
    "chardb_pat_staging_abc",
    "chardb_pat_prod_",
    "chardb_pat_",
    "ghp_abc",
    "",
  ])("names no environment for %j", (token) => {
    expect(tokenEnvironment(token)).toBeNull();
  });
});

describe("graphqlUrl", () => {
  it("sends prod and dev tokens to their deployed APIs", () => {
    expect(graphqlUrl("prod", {})).toBe("https://api.chardb.cc/graphql");
    expect(graphqlUrl("dev", {})).toBe("https://api.dev.chardb.cc/graphql");
  });

  it("sends a local token to this checkout's backend", () => {
    expect(
      graphqlUrl("local", {
        GRAPHQL_ENDPOINT: "http://localhost:21001/graphql",
      }),
    ).toBe("http://localhost:21001/graphql");
  });

  it("falls back to slot 0 for a local token outside a checkout", () => {
    expect(graphqlUrl("local", {})).toBe("http://localhost:4000/graphql");
  });

  it("prefers the flag, then CHARDB_API_URL, over the default", () => {
    expect(
      graphqlUrl(
        "prod",
        { CHARDB_API_URL: "https://env.example/graphql" },
        "https://flag.example/graphql",
      ),
    ).toBe("https://flag.example/graphql");
    expect(
      graphqlUrl("prod", { CHARDB_API_URL: "https://env.example/graphql" }),
    ).toBe("https://env.example/graphql");
  });

  it("adds /graphql to an override that names only the host", () => {
    expect(graphqlUrl("dev", {}, "http://localhost:4000")).toBe(
      "http://localhost:4000/graphql",
    );
    expect(graphqlUrl("dev", {}, "http://localhost:4000/")).toBe(
      "http://localhost:4000/graphql",
    );
  });
});
