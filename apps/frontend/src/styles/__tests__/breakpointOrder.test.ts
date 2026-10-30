import { columns } from "./__fixtures__/breakpointOrder.css";

const css = () =>
  [...document.querySelectorAll("style")]
    .map((style) => style.textContent)
    .join("\n");

// Only the fixture's own rules: other stylesheets (sprinkles) emit the same
// queries already in order.
const queriesFor = (className: string) =>
  [...css().matchAll(/@media ([^{]+)\{\s*\.([\w-]+)/g)]
    .filter((match) => match[2] === className)
    .map((match) => match[1].trim());

describe("breakpoint order", () => {
  it("emits mq() queries smallest-first whatever order they are written in", () => {
    expect(queriesFor(columns)).toEqual([
      "screen and (min-width: 40em)",
      "screen and (min-width: 48em)",
      "screen and (min-width: 64em)",
    ]);
  });
});
