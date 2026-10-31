import { style } from "@vanilla-extract/css";
import { vars } from "@chardb/ui/theme";

/** The cart and recent purchases, kept in view while the listings scroll. */
export const cart = style({
  position: "sticky",
  top: vars.space.md,
});
