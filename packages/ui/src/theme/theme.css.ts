import { createGlobalTheme, globalStyle } from "@vanilla-extract/css";
import { colorVars, sharedVars } from "./contract.css";
import {
  darkColors,
  lightColors,
  reducedMotionDurations,
  sharedTokens,
} from "./tokens";

// The bare `:root` keeps a page without `data-theme` (scripts off, unit tests)
// on the light theme.
const light = ':root, :root[data-theme="light"]';
const dark = ':root[data-theme="dark"]';

createGlobalTheme(light, colorVars, lightColors);
createGlobalTheme(dark, colorVars, darkColors);
globalStyle(light, { colorScheme: "light" });
globalStyle(dark, { colorScheme: "dark" });

// On `:root` rather than the theme selectors, so the reduced-motion override
// below has the same specificity and wins by coming later.
createGlobalTheme(":root", sharedVars, sharedTokens);

const duration = sharedVars.motion.duration;

globalStyle(":root", {
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      vars: {
        [duration.fast]: reducedMotionDurations.fast,
        [duration.normal]: reducedMotionDurations.normal,
        [duration.slow]: reducedMotionDurations.slow,
        [duration.essential]: reducedMotionDurations.essential,
      },
      scrollBehavior: "auto",
    },
  },
});
