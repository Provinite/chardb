import { createVar, style } from "@vanilla-extract/css";
import { vars } from "../theme/contract.css";

/** Where the panel sits, and how big it may be, from `useAnchoredPosition`. */
export const top = createVar();
export const left = createVar();
export const maxWidth = createVar();
export const maxHeight = createVar();
/** Where along the panel's edge the arrow points at the trigger. */
export const arrowAt = createVar();

/**
 * Half the arrow's diagonal, near enough: how far it pokes out of the panel.
 * The arrow is a square turned 45°, so its half-width is the square's side
 * times √2/2.
 */
const arrowHalf = `calc(${vars.space.sm} * 0.7071)`;

export const panel = style({
  position: "fixed",
  top,
  left,
  zIndex: vars.layer.dropdown.base,
  boxSizing: "border-box",
  // The room it has on screen, on whichever side it opened. A fixed panel
  // does not scroll with the page, so what does not fit scrolls inside it
  // instead of off the screen.
  maxInlineSize: maxWidth,
  maxBlockSize: maxHeight,
  display: "flex",
  flexDirection: "column",
  border: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
  borderRadius: vars.radius.md,
  background: vars.surface.raised,
  color: vars.text.default,
  boxShadow: vars.shadow.lg,
  selectors: {
    // Focused only as a fallback, when nothing inside takes focus; the panel
    // is not a control, so it gets no ring.
    "&:focus": { outline: "none" },
  },
});

/**
 * The panel's content, which scrolls when the panel is capped. Inside the
 * panel rather than the panel itself, so the arrow outside its edge is not
 * clipped.
 */
export const body = style({
  flex: 1,
  minBlockSize: 0,
  overflowY: "auto",
  overscrollBehavior: "contain",
  padding: vars.space.md,
});

/**
 * A square turned 45° under the panel's edge, with the panel's own border on
 * its two outer sides, so it reads as part of the panel.
 */
export const arrow = style({
  position: "absolute",
  inlineSize: vars.space.sm,
  blockSize: vars.space.sm,
  background: vars.surface.raised,
  border: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
  selectors: {
    [`${panel}[data-side="bottom"] &`]: {
      top: `calc(-1 * ${arrowHalf})`,
      left: arrowAt,
      transform: "translateX(-50%) rotate(45deg)",
      borderRightColor: "transparent",
      borderBottomColor: "transparent",
    },
    [`${panel}[data-side="top"] &`]: {
      bottom: `calc(-1 * ${arrowHalf})`,
      left: arrowAt,
      transform: "translateX(-50%) rotate(45deg)",
      borderLeftColor: "transparent",
      borderTopColor: "transparent",
    },
    [`${panel}[data-side="right"] &`]: {
      left: `calc(-1 * ${arrowHalf})`,
      top: arrowAt,
      transform: "translateY(-50%) rotate(45deg)",
      borderTopColor: "transparent",
      borderRightColor: "transparent",
    },
    [`${panel}[data-side="left"] &`]: {
      right: `calc(-1 * ${arrowHalf})`,
      top: arrowAt,
      transform: "translateY(-50%) rotate(45deg)",
      borderBottomColor: "transparent",
      borderLeftColor: "transparent",
    },
  },
});
