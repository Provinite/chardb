import { describe, expect, it } from "vitest";
import { overBudget } from "./chunkBudget.mjs";

const chunk = (fileName: string, bytes: number) => ({
  type: "chunk" as const,
  fileName,
  code: "x".repeat(bytes),
});
const asset = (fileName: string, bytes: number) => ({
  type: "asset" as const,
  fileName,
  source: "x".repeat(bytes),
});

describe("overBudget", () => {
  it("names the JavaScript chunks larger than the limit", () => {
    expect(
      overBudget(
        [chunk("small.js", 10), chunk("big.js", 11), asset("big.css", 99)],
        10,
      ),
    ).toEqual([{ fileName: "big.js", bytes: 11 }]);
  });

  it("measures bytes, not characters", () => {
    // Two characters, four bytes in UTF-8.
    expect(overBudget([{ ...chunk("accents.js", 0), code: "éé" }], 3)).toEqual([
      { fileName: "accents.js", bytes: 4 },
    ]);
  });
});
