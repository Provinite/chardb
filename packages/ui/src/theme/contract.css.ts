import { createGlobalThemeContract } from "@vanilla-extract/css";
import { lightColors, sharedTokens } from "./tokens";

/**
 * Every token as a CSS custom property, named after its path:
 * `vars.action.primary.bgHover` is `var(--action-primary-bgHover)`.
 */
export const vars = createGlobalThemeContract(
  { ...lightColors, ...sharedTokens },
  (_value, path) => path.join("-"),
);
