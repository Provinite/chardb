import {
  accessTokenSecretEnvironment,
  bearerCredential,
  generateAccessTokenSecret,
  isAccessTokenSecret,
} from "./access-token-secret";

describe("generateAccessTokenSecret", () => {
  it("names the environment it was made in", () => {
    const secret = generateAccessTokenSecret("prod");

    expect(secret).toMatch(/^chardb_pat_prod_[A-Za-z0-9_-]{43}$/);
    expect(isAccessTokenSecret(secret)).toBe(true);
    expect(accessTokenSecretEnvironment(secret)).toBe("prod");
  });

  it("makes a different secret each time", () => {
    expect(generateAccessTokenSecret("local")).not.toBe(
      generateAccessTokenSecret("local"),
    );
  });
});

describe("accessTokenSecretEnvironment", () => {
  it.each([
    ["chardb_pat_dev_abc", "dev"],
    ["chardb_pat_local_a_b_c", "local"],
  ])("reads %s as %s", (secret, environment) => {
    expect(accessTokenSecretEnvironment(secret)).toBe(environment);
  });

  it.each([
    ["no environment", "chardb_pat_abc"],
    ["an unknown environment", "chardb_pat_staging_abc"],
    ["nothing after the environment", "chardb_pat_prod_"],
  ])("finds none in a secret with %s", (_case, secret) => {
    expect(accessTokenSecretEnvironment(secret)).toBeNull();
  });
});

describe("bearerCredential", () => {
  it("reads the credential from the Authorization header", () => {
    expect(
      bearerCredential({ headers: { authorization: "Bearer chardb_pat_x" } }),
    ).toBe("chardb_pat_x");
  });

  // RFC 6750: the scheme is case-insensitive. A script that writes it in
  // lower case must still be heard as a token, not run as anonymous.
  it("reads it whatever the scheme's case", () => {
    expect(
      bearerCredential({ headers: { authorization: "bearer chardb_pat_x" } }),
    ).toBe("chardb_pat_x");
  });

  it("reads a subscription's from its connection parameters", () => {
    expect(
      bearerCredential({
        connectionParams: { authorization: "Bearer chardb_pat_x" },
      }),
    ).toBe("chardb_pat_x");
  });

  it.each([
    ["no request", undefined],
    ["no headers", {}],
    ["another scheme", { headers: { authorization: "Basic abc" } }],
  ])("finds nothing with %s", (_case, req) => {
    expect(bearerCredential(req)).toBeNull();
  });
});
