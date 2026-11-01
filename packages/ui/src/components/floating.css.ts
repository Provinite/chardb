import { createVar, style } from "@vanilla-extract/css";
import { vars } from "../theme/contract.css";

/**
 * What popovers, tooltips and toggletips share: a raised box fixed beside
 * its anchor, placed by `useAnchoredPosition` through `applyPlacement`, with
 * an arrow pointing back at it.
 */

/** Where it sits, and how big it may be. */
export const top = createVar();
export const left = createVar();
export const maxWidth = createVar();
export const maxHeight = createVar();
/** Where along its edge the arrow points at the anchor. */
export const arrowAt = createVar();

/**
 * Half the arrow's diagonal, near enough: how far it pokes out of the box.
 * The arrow is a square turned 45°, so its half-width is the square's side
 * times √2/2.
 */
const arrowHalf = `calc(${vars.space.sm} * 0.7071)`;

export const floating = style({
  position: "fixed",
  top,
  left,
  boxSizing: "border-box",
  // The room it has on screen, on whichever side it opened. Fixed, it does
  // not scroll with the page, so what does not fit is capped instead.
  maxInlineSize: maxWidth,
  maxBlockSize: maxHeight,
  border: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
  background: vars.surface.raised,
  color: vars.text.default,
  boxShadow: vars.shadow.lg,
});

/**
 * A square turned 45° under the box's edge, with the box's own border on its
 * two outer sides, so it reads as part of the box. Placed by the box's
 * `data-side`, which `applyPlacement` sets.
 */
export const arrow = style({
  position: "absolute",
  inlineSize: vars.space.sm,
  blockSize: vars.space.sm,
  background: vars.surface.raised,
  border: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
  selectors: {
    [`${floating}[data-side="bottom"] &`]: {
      top: `calc(-1 * ${arrowHalf})`,
      left: arrowAt,
      transform: "translateX(-50%) rotate(45deg)",
      borderRightColor: "transparent",
      borderBottomColor: "transparent",
    },
    [`${floating}[data-side="top"] &`]: {
      bottom: `calc(-1 * ${arrowHalf})`,
      left: arrowAt,
      transform: "translateX(-50%) rotate(45deg)",
      borderLeftColor: "transparent",
      borderTopColor: "transparent",
    },
    [`${floating}[data-side="right"] &`]: {
      left: `calc(-1 * ${arrowHalf})`,
      top: arrowAt,
      transform: "translateY(-50%) rotate(45deg)",
      borderTopColor: "transparent",
      borderRightColor: "transparent",
    },
    [`${floating}[data-side="left"] &`]: {
      right: `calc(-1 * ${arrowHalf})`,
      top: arrowAt,
      transform: "translateY(-50%) rotate(45deg)",
      borderBottomColor: "transparent",
      borderLeftColor: "transparent",
    },
  },
});
