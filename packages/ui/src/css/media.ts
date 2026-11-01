import type { StyleRule } from "@vanilla-extract/css";
import { breakpoints, type Breakpoint } from "./breakpoints";

export type SelectorStyle = NonNullable<StyleRule["selectors"]>[string];

/** The media query for a breakpoint, for use as a key under `"@media"`. */
export const mq = (bp: Breakpoint) =>
  `screen and (min-width: ${breakpoints[bp]}em)`;

/** Devices that can hover. A bare `:hover` sticks after a tap on touch screens. */
export const hoverQuery = "(hover: hover)";

/**
 * Devices whose main pointer is a finger. Touch targets grow to 44px under
 * it; a fine pointer keeps the denser layout. Used as a key under `"@media"`.
 */
export const touchQuery = "(pointer: coarse)";

export const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

/**
 * Hover styles, applied only on devices that hover, keyed by selector:
 * `hover({ "&:hover:not(:disabled)": { background: … } })`. Returns the
 * contents of the `"@media"` key, so it spreads beside `mq()` entries. Every
 * selector goes in one call: a second spread would replace the first.
 */
export const hover = (
  selectors: Record<string, SelectorStyle>,
): Record<string, { selectors: Record<string, SelectorStyle> }> => ({
  [hoverQuery]: { selectors },
});
