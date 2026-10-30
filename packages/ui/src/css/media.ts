import type { StyleRule } from "@vanilla-extract/css";
import { breakpoints, type Breakpoint } from "./breakpoints";

export type SelectorStyle = NonNullable<StyleRule["selectors"]>[string];

/** The media query for a breakpoint, for use as a key under `"@media"`. */
export const mq = (bp: Breakpoint) =>
  `screen and (min-width: ${breakpoints[bp]}em)`;

/** Devices that can hover. A bare `:hover` sticks after a tap on touch screens. */
export const hoverQuery = "(hover: hover)";

export const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

/**
 * Hover styles, applied only on devices that hover. Returns the contents of
 * the `"@media"` key, so it spreads beside `mq()` entries:
 * `"@media": { ...hover({ color: vars.text.link }), [mq("md")]: { … } }`.
 */
export const hover = (
  rules: SelectorStyle,
  selector = "&:hover",
): Record<string, { selectors: Record<string, SelectorStyle> }> => ({
  [hoverQuery]: { selectors: { [selector]: rules } },
});
