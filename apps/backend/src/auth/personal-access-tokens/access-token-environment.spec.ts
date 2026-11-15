import {
  accessTokenEnvironment,
  UnknownAppEnvironmentError,
} from "./access-token-environment";

describe("accessTokenEnvironment", () => {
  it.each(["prod", "dev", "local"] as const)(
    "is %s when APP_ENVIRONMENT says so",
    (name) => {
      expect(
        accessTokenEnvironment({
          APP_ENVIRONMENT: name,
          NODE_ENV: "production",
        }),
      ).toBe(name);
    },
  );

  it("is local on a machine that sets nothing", () => {
    expect(accessTokenEnvironment({ NODE_ENV: "development" })).toBe("local");
    expect(accessTokenEnvironment({ NODE_ENV: "test" })).toBe("local");
    expect(accessTokenEnvironment({})).toBe("local");
  });

  // A deployed server that names no environment must not guess one: a token
  // labelled prod on the dev stack is the mistake the label exists to stop.
  it("is none on a production build that names no environment", () => {
    expect(accessTokenEnvironment({ NODE_ENV: "production" })).toBeNull();
    expect(
      accessTokenEnvironment({ NODE_ENV: "production", APP_ENVIRONMENT: "" }),
    ).toBeNull();
  });

  it("refuses an environment it does not know", () => {
    expect(() =>
      accessTokenEnvironment({ APP_ENVIRONMENT: "production" }),
    ).toThrow(UnknownAppEnvironmentError);
  });
});
