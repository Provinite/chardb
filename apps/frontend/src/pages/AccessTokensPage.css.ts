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

export const title = style({
  margin: 0,
  color: vars.text.default,
  fontSize: vars.font.size.xxl,
  fontWeight: vars.font.weight.bold,
});

export const intro = style({
  margin: 0,
  color: vars.text.muted,
});

export const heading = style({
  margin: 0,
  color: vars.text.default,
  fontSize: vars.font.size.xl,
  fontWeight: vars.font.weight.semibold,
});

/** Stands in for one token card while the list loads. */
export const skeleton = style({
  blockSize: `calc(${vars.space.xxl} * 3)`,
  borderRadius: vars.radius.lg,
  background: vars.surface.sunken,
});
