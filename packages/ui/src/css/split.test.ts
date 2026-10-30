import { describe, expect, it } from "vitest";
import { classSelector, declarationsFor } from "../test/emittedCss";
import { split } from "./split.css";

describe("split", () => {
  it.each([
    ["1:1", "minmax(0, 1fr) minmax(0, 1fr)"],
    ["2:1", "minmax(0, 2fr) minmax(0, 1fr)"],
    ["1:2", "minmax(0, 1fr) minmax(0, 2fr)"],
    ["1:1:1", "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)"],
    ["3:1", "minmax(0, 3fr) minmax(0, 1fr)"],
  ] as const)("%s is a grid in that ratio", (ratio, columns) => {
    const css = declarationsFor(classSelector(split[ratio]));
    expect(css).toContain("display: grid");
    expect(css).toContain(`grid-template-columns: ${columns}`);
  });

  it("leaves the gap to the caller", () => {
    const css = declarationsFor(classSelector(split["1:1"]));
    expect(css).toContain("display: grid");
    expect(css).not.toContain("gap");
  });
});
