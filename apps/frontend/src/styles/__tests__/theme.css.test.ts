import "@chardb/ui";

// The theme is compiled by the app's build, so it is checked here rather than
// in @chardb/ui. jsdom evaluates no media queries, so these read the emitted
// stylesheet.
const css = () =>
  [...document.querySelectorAll("style")]
    .map((style) => style.textContent)
    .join("\n");

const reducedMotionBlock = () =>
  css().match(
    /@media \(prefers-reduced-motion: reduce\)\s*{([\s\S]*?)}\s*}/,
  )?.[1] ?? "";

describe("theme stylesheet", () => {
  it("sets color-scheme for each theme", () => {
    expect(css()).toMatch(
      /:root\[data-theme="dark"\]\s*{[^}]*color-scheme:\s*dark/,
    );
    expect(css()).toMatch(
      /:root, :root\[data-theme="light"\]\s*{[^}]*color-scheme:\s*light/,
    );
  });

  it("makes transitions instant under reduced motion", () => {
    const block = reducedMotionBlock();
    for (const name of ["fast", "normal", "slow"]) {
      expect(block).toContain(`--motion-duration-${name}: 0.01ms`);
    }
  });

  it("slows the essential loop under reduced motion instead of stopping it", () => {
    expect(reducedMotionBlock()).toContain("--motion-duration-essential: 2s");
  });

  it("turns off smooth scrolling under reduced motion", () => {
    expect(reducedMotionBlock()).toContain("scroll-behavior: auto");
  });
});
