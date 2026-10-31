// @ts-check

/**
 * Rules for the styling conventions in apps/frontend/STYLING.md. Plain
 * CommonJS so ESLint can load it without a build step.
 */
module.exports = {
  rules: {
    "grid-columns-via-track": require("./rules/grid-columns-via-track"),
    "hover-in-hover-condition": require("./rules/hover-in-hover-condition"),
    "loop-via-helper": require("./rules/loop-via-helper"),
    "no-important": require("./rules/no-important"),
    "no-inline-style": require("./rules/no-inline-style"),
    "no-raw-color": require("./rules/no-raw-color"),
    "no-raw-font": require("./rules/no-raw-font"),
    "no-raw-length": require("./rules/no-raw-length"),
    "no-raw-media": require("./rules/no-raw-media"),
    "no-raw-motion": require("./rules/no-raw-motion"),
    "no-raw-radius-shadow": require("./rules/no-raw-radius-shadow"),
    "no-raw-z-index": require("./rules/no-raw-z-index"),
    "no-styled-components": require("./rules/no-styled-components"),
  },
};
