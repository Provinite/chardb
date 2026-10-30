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

/** The top-level nodes after the plugins run: a rule's selector or an at-rule's prelude. */
const order = (from: string) =>
  postcss(config.plugins)
    .process(css, { from })
    .root.nodes.map((node) => {
      if (node.type === "rule") return node.selector;
      if (node.type === "atrule") return `@${node.name} ${node.params}`;
      return node.type;
    });

describe("postcss config", () => {
  it("sorts media queries smallest-first in vanilla-extract output", () => {
    expect(order("/app/src/Card.css.ts.vanilla.css")).toEqual([
      ".a",
      "@media (min-width: 40em)",
      "@media (min-width: 64em)",
    ]);
  });

  it("leaves other stylesheets in their written order", () => {
    expect(order("/app/node_modules/@mantine/core/styles.css")).toEqual([
      "@media (min-width: 64em)",
      ".a",
      "@media (min-width: 40em)",
    ]);
  });
});
