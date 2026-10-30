import { createGlobalTheme, globalStyle } from "@vanilla-extract/css";
import { vars } from "./contract.css";
import {
  darkColors,
  lightColors,
  reducedMotionDurations,
  sharedTokens,
} from "./tokens";

const { surface, text, border, action, status, ...shared } = vars;
const colors = { surface, text, border, action, status };

// The bare `:root` keeps a page without `data-theme` (scripts off, unit tests)
// on the light theme.
const light = ':root, :root[data-theme="light"]';
const dark = ':root[data-theme="dark"]';

createGlobalTheme(light, colors, lightColors);
createGlobalTheme(dark, colors, darkColors);
globalStyle(light, { colorScheme: "light" });
globalStyle(dark, { colorScheme: "dark" });

// On `:root` rather than the theme selectors, so the reduced-motion override
// below has the same specificity and wins by coming later.
createGlobalTheme(":root", shared, sharedTokens);

globalStyle(":root", {
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      vars: {
        [vars.motion.duration.fast]: reducedMotionDurations.fast,
        [vars.motion.duration.normal]: reducedMotionDurations.normal,
        [vars.motion.duration.slow]: reducedMotionDurations.slow,
        [vars.motion.duration.essential]: reducedMotionDurations.essential,
      },
      scrollBehavior: "auto",
    },
  },
});
