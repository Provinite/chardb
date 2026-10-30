import { describe, expect, it } from "vitest";
import { classSelector, declarationsFor } from "../test/emittedCss";
import { pulse, shimmer, spinner } from "./__fixtures__/loops.css";
import { reducedMotionQuery } from "./media";

const reduced = `@media ${reducedMotionQuery}`;

describe("loop", () => {
  it("runs an essential loop forever on the essential duration", () => {
    const css = declarationsFor(classSelector(spinner));
    expect(css).toContain("animation-iteration-count: infinite");
    expect(css).toContain(
      "animation-duration: var(--motion-duration-essential)",
    );
    expect(css).toContain(
      "animation-timing-function: var(--motion-easing-linear)",
    );
  });

  it("keeps an essential loop running under reduced motion", () => {
    expect(declarationsFor(classSelector(spinner), reduced)).toBeUndefined();
  });

  it("stops a decorative loop under reduced motion", () => {
    expect(declarationsFor(classSelector(shimmer), reduced)).toContain(
      "animation-name: none",
    );
  });

  it("gives a decorative loop the duration and easing it is passed", () => {
    const css = declarationsFor(classSelector(shimmer));
    expect(css).toContain("animation-iteration-count: infinite");
    expect(css).toContain("animation-duration: var(--motion-duration-slow)");
    expect(css).toContain(
      "animation-timing-function: var(--motion-easing-standard)",
    );
  });

  it("defaults a decorative loop to the essential duration", () => {
    expect(declarationsFor(classSelector(pulse))).toContain(
      "animation-duration: var(--motion-duration-essential)",
    );
  });
});
