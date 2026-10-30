// Sorts each file's media queries smallest-first after vanilla-extract emits
// them, so a wider breakpoint always overrides a narrower one.
module.exports = {
  plugins: {
    "postcss-sort-media-queries": { sort: "mobile-first" },
  },
};
