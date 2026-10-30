import "@chardb/ui";
import { reducedMotionQuery } from "@chardb/ui/theme";
import { rulesForSelectors } from "../../__tests__/emittedCss";

// The theme is compiled by the app's build, so it is checked here rather than
// in @chardb/ui. jsdom evaluates no media queries, so these read the emitted
// stylesheet.

const reducedMotionRoot = () => {
  const rule = rulesForSelectors(":root").find(
    ({ conditions }) =>
      conditions.length === 1 &&
      conditions[0] === `@media ${reducedMotionQuery}`,
  );
  return rule?.declarations ?? {};
};

describe("theme stylesheet", () => {
  it("sets color-scheme for each theme", () => {
    expect(rulesForSelectors(':root[data-theme="dark"]')).toContainEqual(
      expect.objectContaining({
        conditions: [],
        declarations: expect.objectContaining({ "color-scheme": "dark" }),
      }),
    );
    expect(
      rulesForSelectors(":root", ':root[data-theme="light"]'),
    ).toContainEqual(
      expect.objectContaining({
        conditions: [],
        declarations: expect.objectContaining({ "color-scheme": "light" }),
      }),
    );
  });

  it("makes transitions instant under reduced motion", () => {
    expect(reducedMotionRoot()).toEqual(
      expect.objectContaining({
        "--motion-duration-fast": "0.01ms",
        "--motion-duration-normal": "0.01ms",
        "--motion-duration-slow": "0.01ms",
      }),
    );
  });

  it("slows the essential loop under reduced motion instead of stopping it", () => {
    expect(reducedMotionRoot()["--motion-duration-essential"]).toBe("2s");
  });

  it("turns off smooth scrolling under reduced motion", () => {
    expect(reducedMotionRoot()["scroll-behavior"]).toBe("auto");
  });
});
