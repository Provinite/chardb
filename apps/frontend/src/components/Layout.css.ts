import { style } from "@vanilla-extract/css";
import { vars } from "@chardb/ui/theme";

export const layout = style({
  display: "flex",
  flexDirection: "column",
  minBlockSize: "100vh",
});

/** The navigation and the page, side by side from `md`. */
export const body = style({
  display: "flex",
  flex: 1,
  position: "relative",
});

export const main = style({
  flex: 1,
  paddingBlock: vars.space.xl,
  // Lets the page shrink below its content's width instead of overflowing.
  minInlineSize: 0,
});
