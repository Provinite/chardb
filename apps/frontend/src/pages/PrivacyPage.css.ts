import { style } from "@vanilla-extract/css";
import { vars } from "@chardb/ui/theme";

export const page = style({
  boxSizing: "border-box",
  inlineSize: "100%",
  maxInlineSize: vars.size.prose,
  marginInline: "auto",
  paddingBlock: vars.space.xl,
  paddingInline: vars.space.md,
});
