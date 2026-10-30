import { describe, expect, it } from "vitest";
import { rulesFor } from "../__tests__/emittedCss";
import { pulse, shimmer, spinner } from "./__fixtures__/loops.css";
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

  it("defaults a decorative loop to the essential duration", () => {
    expect(rulesFor(pulse)[0].declarations["animation-duration"]).toBe(
      "var(--motion-duration-essential)",
    );
  });
});
