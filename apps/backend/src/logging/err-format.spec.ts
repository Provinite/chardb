import { errFormat } from "./err-format";

class LookupFailedError extends Error {
  readonly name = "LookupFailedError";
  constructor(
    readonly userId: string,
    options?: ErrorOptions,
  ) {
    super("Lookup failed", options);
  }
}

const format = (info: Record<string, unknown>) =>
  errFormat().transform({ level: "warn", message: "m", ...info }) as Record<
    string,
    unknown
  >;

describe("errFormat", () => {
  it("turns an Error under `err` into its name, message and stack", () => {
    const err = new Error("database down");
    expect(format({ err }).err).toEqual({
      name: "Error",
      message: "database down",
      stack: err.stack,
    });
  });

  it("keeps a typed error's own fields", () => {
    const out = format({ err: new LookupFailedError("u1") }).err;
    expect(out).toEqual(
      expect.objectContaining({
        name: "LookupFailedError",
        message: "Lookup failed",
        userId: "u1",
      }),
    );
  });

  it("follows the cause", () => {
    const root = Object.assign(new Error("connection reset"), {
      code: "ECONNRESET",
    });
    const out = format({ err: new LookupFailedError("u1", { cause: root }) })
      .err as { cause: unknown };
    expect(out.cause).toEqual(
      expect.objectContaining({
        name: "Error",
        message: "connection reset",
        code: "ECONNRESET",
      }),
    );
  });

  it("stops following causes after a few", () => {
    let err: Error = new Error("0");
    for (let i = 1; i < 10; i++) err = new Error(String(i), { cause: err });
    let out = format({ err }).err as { cause?: unknown } | string;
    let depth = 0;
    while (typeof out === "object" && out.cause !== undefined) {
      out = out.cause as typeof out;
      depth++;
    }
    expect(depth).toBeLessThanOrEqual(5);
  });

  it("leaves a non-Error under `err` alone", () => {
    expect(format({ err: "just a string" }).err).toBe("just a string");
  });

  it("leaves an Error under any other key alone", () => {
    const error = new Error("elsewhere");
    expect(format({ error }).error).toBe(error);
  });
});
