import { style } from "@vanilla-extract/css";
import { hover, vars } from "@chardb/ui/theme";

/**
 * Both labels in one grid cell, so the button is always as wide as the
 * longer one and keeps its width as it flips.
 */
export const labels = style({
  display: "grid",
});

export const label = style({
  gridArea: "1 / 1",
});

/** The label not in use: holds its width, hidden from sight and the name. */
export const inactiveLabel = style([label, { visibility: "hidden" }]);

/**
 * A followed button: quiet at rest, red under the pointer, so the press that
 * unfollows reads as one. On a ghost `Button`; the class is named twice so
 * these rules outrank the recipe's tone whatever order the stylesheets load
 * in.
 */
export const following = style({
  selectors: {
    "&&": { borderColor: vars.border.input },
  },
  "@media": hover({
    '&&:hover:not(:disabled):not([aria-disabled="true"])': {
      backgroundColor: vars.status.danger.bgSubtle,
      color: vars.status.danger.fg,
      borderColor: vars.status.danger.border,
    },
  }),
});

export const count = style({
  color: vars.text.muted,
  fontSize: vars.font.size.sm,
  fontVariantNumeric: "tabular-nums",
});
