import { style } from "@vanilla-extract/css";
import { vars } from "@chardb/ui/theme";

export const section = style({
  marginBlock: vars.space.sm,
});

export const heading = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  margin: 0,
  marginBlockEnd: vars.space.xs,
  marginInline: vars.space.sm,
  paddingBlock: vars.space.sm,
  paddingInline: vars.space.md,
  background: vars.event.halloween.bg,
  color: vars.event.halloween.fg,
  // Forced colours drop the background: the border keeps the box.
  border: `${vars.borderWidth.hairline} solid transparent`,
  borderBlockEnd: `${vars.borderWidth.thick} solid ${vars.event.halloween.accent}`,
  borderRadius: vars.radius.lg,
  fontSize: vars.font.size.lg,
  fontWeight: vars.font.weight.bold,
  lineHeight: vars.font.lineHeight.tight,
  textTransform: "uppercase",
});

export const icon = style({
  flexShrink: 0,
  width: vars.font.size.xl,
  height: vars.font.size.xl,
  color: vars.event.halloween.accent,
});

export const title = style({
  flex: 1,
  minWidth: 0,
});
