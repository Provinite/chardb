const sortMediaQueries = require("postcss-sort-media-queries")({
  sort: "mobile-first",
});

// Sorts the media queries in each `.css.ts` file's output smallest-first, so
// within one file a wider breakpoint overrides a narrower one. Other
// stylesheets (third-party ones, index.css) are written in an order they rely on, so
// they are left alone.
const sortVanillaExtractMediaQueries = {
  postcssPlugin: "sort-vanilla-extract-media-queries",
  OnceExit(root, helpers) {
    if (root.source?.input.file?.includes(".css.ts.vanilla.css")) {
      return sortMediaQueries.OnceExit(root, helpers);
    }
  },
};

module.exports = {
  plugins: [sortVanillaExtractMediaQueries],
};
