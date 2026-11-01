import { style } from "@vanilla-extract/css";
import { vars } from "@chardb/ui/theme";

/** A checkbox and its label, a full touch target tall. */
export const choice = style({
  display: "flex",
  alignItems: "baseline",
  gap: vars.space.sm,
  minBlockSize: vars.size.target.comfortable,
  color: vars.text.default,
  fontSize: vars.font.size.md,
  lineHeight: vars.font.lineHeight.normal,
  cursor: "pointer",
});

export const box = style({
  flexShrink: 0,
  margin: 0,
  cursor: "pointer",
});

export const hint = style({
  display: "block",
  color: vars.text.muted,
  fontSize: vars.font.size.sm,
});
