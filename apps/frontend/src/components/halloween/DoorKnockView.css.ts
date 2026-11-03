import { style } from "@vanilla-extract/css";
import { vars } from "@chardb/ui/theme";

/** Below the profile's other actions. */
export const root = style({
  marginBlockStart: vars.space.md,
});

/** Under the button; kept as tall as a line while the door loads. */
export const status = style({
  color: vars.text.muted,
  fontSize: vars.font.size.sm,
  lineHeight: vars.font.lineHeight.normal,
  minBlockSize: `calc(${vars.font.size.sm} * ${vars.font.lineHeight.normal})`,
  fontVariantNumeric: "tabular-nums",
  margin: 0,
});
