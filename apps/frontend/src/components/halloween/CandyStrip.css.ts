import { style } from "@vanilla-extract/css";
import { vars } from "@chardb/ui/theme";

export const strip = style({
  marginBlockStart: vars.space.xs,
});

export const candy = style({
  display: "block",
  width: vars.size.target.comfortable,
  height: vars.size.target.comfortable,
  objectFit: "contain",
});
