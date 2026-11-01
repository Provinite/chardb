import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { colorAt, pairs, requiredRatio, type Pair } from "./pairs";
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
    expect(ratio).toBeGreaterThanOrEqual(requiredRatio(pair, name));
  });
});

const leafPaths = (node: object, prefix = ""): string[] =>
  Object.entries(node).flatMap(([key, value]) =>
    typeof value === "string"
      ? [`${prefix}${key}`]
      : leafPaths(value, `${prefix}${key}.`),
  );

describe("pair list", () => {
  // Disabled controls are exempt from contrast, and the overlay is a scrim
  // over other content, not a background text sits on.
  const backgrounds = leafPaths(lightColors).filter(
    (path) =>
      (path.startsWith("surface.") || /\.bg[A-Z]?\w*$/.test(path)) &&
      !path.endsWith("bgDisabled") &&
      path !== "surface.overlay",
  );

  it.each(backgrounds)("lists a foreground for %s", (bg) => {
    expect(pairs.some((pair) => pair.bg === bg)).toBe(true);
  });
});

// Toasts, and alerts with an action, tint their background in a status
// colour, so a control inside them draws its focus ring on that tint.
describe("pairs a status tint carries", () => {
  it.each(["success", "warning", "danger", "info"] as const)(
    "lists the focus ring on status.%s.bgSubtle",
    (status) => {
      expect(pairs).toContainEqual(
        expect.objectContaining({
          fg: "border.focus",
          bg: `status.${status}.bgSubtle`,
          use: "nonText",
        }),
      );
    },
  );
});

// An outline button's label is the primary colour on whatever surface the
// button sits on.
describe("pairs an outline button carries", () => {
  it.each(["surface.page", "surface.raised", "surface.sunken"] as const)(
    "lists action.primary.fgOutline as body text on %s",
    (bg) => {
      expect(pairs).toContainEqual(
        expect.objectContaining({
          fg: "action.primary.fgOutline",
          bg,
          use: "body",
        }),
      );
    },
  );
});

describe("requiredRatio", () => {
  const pair: Pair = { fg: "text.subtle", bg: "surface.page", use: "body" };

  it("is the use's threshold without a floor", () => {
    expect(requiredRatio(pair, "light")).toBe(4.5);
    expect(requiredRatio({ ...pair, use: "nonText" }, "light")).toBe(3);
  });

  it("is the floor for the theme that has one", () => {
    const floored: Pair = {
      ...pair,
      floor: { dark: { ratio: 3.7, reason: "Approved by eye" } },
    };
    expect(requiredRatio(floored, "dark")).toBe(3.7);
    expect(requiredRatio(floored, "light")).toBe(4.5);
  });
});
