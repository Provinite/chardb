// @ts-check

/**
 * Rules that keep backend permission checks behind RequestPermissions. Plain
 * CommonJS so ESLint can load it without a build step.
 */
module.exports = {
  rules: {
    "no-model-permission-read": require("./rules/no-model-permission-read"),
  },
};
