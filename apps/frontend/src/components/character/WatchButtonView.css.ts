import { style } from "@vanilla-extract/css";

/**
 * Both labels in one grid cell, so the button is as wide as the longer one
 * and keeps its width as it flips.
 */
export const labels = style({
  display: "grid",
});

export const label = style({
  gridArea: "1 / 1",
});

/** The label not in use: holds its width, hidden from sight and the name. */
export const inactiveLabel = style([label, { visibility: "hidden" }]);
