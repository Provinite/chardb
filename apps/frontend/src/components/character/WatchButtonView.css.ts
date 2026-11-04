import { style } from "@vanilla-extract/css";
import { vars } from "@chardb/ui/theme";

/**
 * A watched button: a quiet ghost keeping the outline's border, so the two
 * states are the same size. The class is named twice so it outranks the
 * recipe's tone whatever order the stylesheets load in.
 */
export const watching = style({
  selectors: {
    "&&:not(:disabled)": { borderColor: vars.border.input },
  },
});

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
