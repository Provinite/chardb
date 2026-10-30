import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { colorAt, pairs, thresholds } from "./pairs";
import { darkColors, lightColors } from "./tokens";

describe("contrastRatio", () => {
  it("is 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("is 1 for a colour on itself", () => {
    expect(contrastRatio("#8b5cf6", "#8b5cf6")).toBe(1);
  });

  it("does not depend on which colour is the foreground", () => {
    expect(contrastRatio("#1e293b", "#f8fafc")).toBe(
      contrastRatio("#f8fafc", "#1e293b"),
    );
  });

  it("matches a known ratio", () => {
    // #767676 on white is the lightest grey that passes 4.5:1.
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });

  it("rejects colours that are not six-digit hex", () => {
    expect(() => contrastRatio("rgb(0 0 0 / 0.5)", "#ffffff")).toThrow();
  });
});

const themes = { light: lightColors, dark: darkColors } as const;
const themeNames = Object.keys(themes) as (keyof typeof themes)[];

describe.each(themeNames)("%s theme pairs", (name) => {
  const colors = themes[name];
  it.each(
    pairs.map((pair) => [`${pair.fg} on ${pair.bg} (${pair.use})`, pair]),
  )("%s", (_label, pair) => {
    const ratio = contrastRatio(
      colorAt(colors, pair.fg),
      colorAt(colors, pair.bg),
    );
    const floor = pair.floor?.[name];
    const required = floor?.ratio ?? thresholds[pair.use];
    expect(ratio).toBeGreaterThanOrEqual(required);
  });
});
