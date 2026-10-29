import { traceDetailOptions } from "./tracing-detail";

/**
 * How much tracing records. On the prod task's quarter of a CPU, tracing was
 * most of a 100-row ledger request's CPU time, and the field and DataLoader
 * spans were the part nobody reads outside a debugging session.
 */
describe("traceDetailOptions", () => {
  it("leaves out field and DataLoader spans by default", () => {
    expect(traceDetailOptions(undefined)).toEqual({
      level: "standard",
      fieldSpans: false,
      dataloaderSpans: false,
    });
  });

  it("records everything at full", () => {
    expect(traceDetailOptions("full")).toEqual({
      level: "full",
      fieldSpans: true,
      dataloaderSpans: true,
    });
  });

  it("reads the value the way a person types it", () => {
    expect(traceDetailOptions("  FULL ").level).toBe("full");
    expect(traceDetailOptions("standard").level).toBe("standard");
    expect(traceDetailOptions("").level).toBe("standard");
  });

  it("falls back to standard on a value it does not know, and says so", () => {
    const options = traceDetailOptions("verbose");

    expect(options.level).toBe("standard");
    expect(options.unrecognised).toBe("verbose");
  });
});
