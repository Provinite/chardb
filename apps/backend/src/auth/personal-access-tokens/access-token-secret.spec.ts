import { bearerCredential } from "./access-token-secret";

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
