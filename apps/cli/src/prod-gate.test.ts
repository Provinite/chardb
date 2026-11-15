import { describe, expect, it } from "vitest";
import { isMutation, prodGate } from "./prod-gate";
import { UsageError } from "./errors";

describe("prodGate", () => {
  const base = { mutation: true, yes: false, interactive: true };

  it("lets a read through anywhere", () => {
    expect(prodGate({ ...base, environment: "prod", mutation: false })).toBe(
      "proceed",
    );
  });

  it("lets a change through outside production", () => {
    expect(prodGate({ ...base, environment: "dev" })).toBe("proceed");
    expect(prodGate({ ...base, environment: "local" })).toBe("proceed");
  });

  it("asks before a change to production", () => {
    expect(prodGate({ ...base, environment: "prod" })).toBe("prompt");
  });

  it("skips the question with --yes", () => {
    expect(prodGate({ ...base, environment: "prod", yes: true })).toBe(
      "proceed",
    );
  });

  it("refuses a change to production with nobody to ask", () => {
    expect(prodGate({ ...base, environment: "prod", interactive: false })).toBe(
      "refuse",
    );
  });
});

describe("isMutation", () => {
  it("tells a mutation from a query", () => {
    expect(isMutation("mutation { a }")).toBe(true);
    expect(isMutation("query { a }")).toBe(false);
    expect(isMutation("{ a }")).toBe(false);
  });

  it("looks at the named operation in a document with several", () => {
    const doc = "query Q { a } mutation M { b }";
    expect(isMutation(doc, "Q")).toBe(false);
    expect(isMutation(doc, "M")).toBe(true);
  });

  it("counts a document with any mutation when no operation is named", () => {
    expect(isMutation("query Q { a } mutation M { b }")).toBe(true);
  });

  it("refuses a document that does not parse", () => {
    expect(() => isMutation("mutation {")).toThrow(UsageError);
  });
});
