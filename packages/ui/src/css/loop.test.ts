import { describe, expect, it } from "vitest";
import { rulesFor } from "../__tests__/emittedCss";
import { pulse, shimmer, spinner } from "./__fixtures__/loops.css";
import { loop } from "./loop";
import { reducedMotionQuery } from "./media";

const loopDeclarations = (duration: string, easing: string) => ({
  "animation-name": expect.any(String),
  "animation-duration": duration,
  "animation-timing-function": easing,
  "animation-iteration-count": "infinite",
});

describe("loop", () => {
  it("runs an essential loop forever on the essential duration, even under reduced motion", () => {
    expect(rulesFor(spinner)).toEqual([
      expect.objectContaining({
        conditions: [],
        declarations: loopDeclarations(
          "var(--motion-duration-essential)",
          "var(--motion-easing-linear)",
        ),
      }),
    ]);
  });

  it("gives a decorative loop its duration and easing, and stops it under reduced motion", () => {
    expect(rulesFor(shimmer)).toEqual([
      expect.objectContaining({
        conditions: [],
        declarations: loopDeclarations(
          "var(--motion-duration-slow)",
          "var(--motion-easing-standard)",
        ),
      }),
      expect.objectContaining({
        conditions: [`@media ${reducedMotionQuery}`],
        declarations: { "animation-name": "none" },
      }),
    ]);
  });

  // `@chardb/ui` re-exports the style helpers, so whatever they import at
  // runtime ships in every bundle that imports a component. A rule object
  // keeps `@vanilla-extract/css` out of the app's JavaScript.
  it("builds a style rule without registering a class", () => {
    expect(loop({ kind: "essential", keyframes: "spin" })).toEqual(
      expect.objectContaining({
        animationName: "spin",
        animationIterationCount: "infinite",
      }),
    );
  });

  it("defaults a decorative loop to the essential duration", () => {
    expect(rulesFor(pulse)[0].declarations["animation-duration"]).toBe(
      "var(--motion-duration-essential)",
    );
  });
});
