import { fileURLToPath } from "node:url";

const source = (path: string) =>
  fileURLToPath(new URL(`../../packages/${path}`, import.meta.url));

/**
 * Workspace packages from source, for vite.config.mts and vitest.config.mts,
 * so the app and its tests resolve them the same way. Exact matches, so
 * `@chardb/ui` and `@chardb/ui/theme` never swallow each other.
 */
export const workspaceAliases = [
  // `.css.ts` files in `@chardb/ui` compile here with the app's. Its dist is
  // only for type declarations.
  { find: /^@chardb\/ui$/, replacement: source("ui/src/index.ts") },
  // `.css.ts` files import from `@chardb/ui/theme`: the root entry would load
  // every component into the style compiler, which adds seconds to each build.
  {
    find: /^@chardb\/ui\/theme$/,
    replacement: source("ui/src/theme/index.ts"),
  },
  // Its dist is CommonJS, and its `require("zod")` resolves to zod's CommonJS
  // build while the app's `import` resolves to the ESM one, shipping zod twice.
  { find: /^@chardb\/shared$/, replacement: source("shared/src/index.ts") },
];
