import { fileURLToPath } from "node:url";

const uiSource = (path: string) =>
  fileURLToPath(new URL(`../../packages/ui/src/${path}`, import.meta.url));

/**
 * `@chardb/ui` and `@chardb/ui/theme` from source, for vite.config.mts and
 * vitest.config.mts. Exact matches, so neither swallows the other.
 *
 * `.css.ts` files import from `@chardb/ui/theme`: the root entry would load
 * every component into the style compiler, which adds seconds to each build.
 */
export const uiAliases = [
  { find: /^@chardb\/ui$/, replacement: uiSource("index.ts") },
  { find: /^@chardb\/ui\/theme$/, replacement: uiSource("theme/index.ts") },
];
