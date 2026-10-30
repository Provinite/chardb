import { describe, expect, it } from "vitest";
import { hover, hoverQuery, mq, reducedMotionQuery } from "./media";

describe("mq", () => {
  it.each([
    ["sm", "screen and (min-width: 40em)"],
    ["md", "screen and (min-width: 48em)"],
    ["lg", "screen and (min-width: 64em)"],
    ["xl", "screen and (min-width: 80em)"],
    ["xxl", "screen and (min-width: 96em)"],
  ] as const)("builds the %s query", (bp, query) => {
    expect(mq(bp)).toBe(query);
  });
});

describe("hover", () => {
  it("nests :hover under the hover-capable condition", () => {
    expect(hover({ color: "red" })).toEqual({
      [hoverQuery]: { selectors: { "&:hover": { color: "red" } } },
    });
  });

  it("takes a narrower hover selector", () => {
    expect(hover({ color: "red" }, "&:hover:not(:disabled)")).toEqual({
      [hoverQuery]: {
        selectors: { "&:hover:not(:disabled)": { color: "red" } },
      },
    });
  });

  it("is the (hover: hover) query", () => {
    expect(hoverQuery).toBe("(hover: hover)");
  });
});

describe("reducedMotionQuery", () => {
  it("is the reduced-motion preference", () => {
    expect(reducedMotionQuery).toBe("(prefers-reduced-motion: reduce)");
  });
});
