import { style } from "@vanilla-extract/css";
import { vars } from "@chardb/ui/theme";

/**
 * Holds the button at its own size whatever its parent does. A column that
 * stretches its children would otherwise stretch the button, and with it the
 * tooltip's hover and long-press area, across the whole row.
 */
export const root = style({
  display: "flex",
});

export const icon = style({
  fontSize: vars.font.size.xxl,
  lineHeight: 1,
});

export const iconSmall = style({
  fontSize: vars.font.size.lg,
  lineHeight: 1,
});
