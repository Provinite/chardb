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

  // RFC 9110 §11.1: the scheme is case-insensitive. A script that writes it
  // in lower case must still be heard as a token, not run as anonymous.
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

  // connectionParams is whatever the client sent; nothing lowercases its
  // keys the way Node does a header's name.
  it("reads connection parameters whatever the key's case", () => {
    expect(
      bearerCredential({
        connectionParams: { Authorization: "Bearer chardb_pat_x" },
      }),
    ).toBe("chardb_pat_x");
  });

  // RFC 9110 allows more than one space after the scheme, and nothing trims
  // connectionParams. Neither may end up inside the credential.
  it.each([
    ["two spaces after the scheme", "Bearer  chardb_pat_x"],
    ["a trailing space", "Bearer chardb_pat_x "],
    ["a leading space", " Bearer chardb_pat_x"],
  ])("reads it with %s", (_case, authorization) => {
    expect(bearerCredential({ connectionParams: { authorization } })).toBe(
      "chardb_pat_x",
    );
  });

  it("reads a JWT-shaped credential whole", () => {
    expect(
      bearerCredential({
        headers: { authorization: "Bearer aaa.bbb-_.c+/==" },
      }),
    ).toBe("aaa.bbb-_.c+/==");
  });

  it.each([
    ["no request", undefined],
    ["no headers", {}],
    ["another scheme", { headers: { authorization: "Basic abc" } }],
    ["a scheme and nothing else", { headers: { authorization: "Bearer " } }],
    [
      "a scheme and blanks",
      { connectionParams: { authorization: "Bearer   " } },
    ],
    ["two credentials", { headers: { authorization: "Bearer abc def" } }],
    [
      "characters a bearer credential cannot hold",
      { headers: { authorization: "Bearer abc\u0000" } },
    ],
  ])("finds nothing with %s", (_case, req) => {
    expect(bearerCredential(req)).toBeNull();
  });

  // A request whose header names another scheme is answered by that header.
  it("does not fall back to connection parameters when the header names another scheme", () => {
    expect(
      bearerCredential({
        headers: { authorization: "Basic abc" },
        connectionParams: { authorization: "Bearer chardb_pat_x" },
      }),
    ).toBeNull();
  });
});
