import { createRequire } from "node:module";
import postcss, { type AcceptedPlugin } from "postcss";

const require = createRequire(import.meta.url);
const config: {
  plugins: AcceptedPlugin[];
} = require("../../../postcss.config.js");

const css = `
@media (min-width: 64em) { .a { color: red; } }
.a { color: blue; }
@media (min-width: 40em) { .a { color: green; } }
`;

const run = (from: string) =>
  postcss(config.plugins).process(css, { from }).css;

const order = (output: string) =>
  [...output.matchAll(/min-width: (\d+)em|color: blue/g)].map((m) => m[0]);

describe("postcss config", () => {
  it("sorts media queries smallest-first in vanilla-extract output", () => {
    expect(order(run("/app/src/Card.css.ts.vanilla.css"))).toEqual([
      "color: blue",
      "min-width: 40em",
      "min-width: 64em",
    ]);
  });

  it("leaves other stylesheets in their written order", () => {
    expect(order(run("/app/node_modules/@mantine/core/styles.css"))).toEqual([
      "min-width: 64em",
      "color: blue",
      "min-width: 40em",
    ]);
  });
});
