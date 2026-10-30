import { createGlobalThemeContract } from "@vanilla-extract/css";
import { lightColors, sharedTokens } from "./tokens";

const byPath = (_value: string | null, path: string[]) => path.join("-");

/** The tokens that differ per theme. */
export const colorVars = createGlobalThemeContract(lightColors, byPath);

/** The tokens both themes share. */
export const sharedVars = createGlobalThemeContract(sharedTokens, byPath);

/**
 * Every token as a CSS custom property, named after its path:
 * `vars.action.primary.bgHover` is `var(--action-primary-bgHover)`.
 */
export const vars = { ...colorVars, ...sharedVars };
