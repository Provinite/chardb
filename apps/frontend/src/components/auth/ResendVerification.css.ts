import { style } from "@vanilla-extract/css";
import { vars } from "@chardb/ui/theme";

export const panel = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  padding: vars.space.md,
  background: vars.surface.raised,
  border: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
  borderInlineStart: `${vars.borderWidth.thick} solid ${vars.action.primary.bg}`,
  borderRadius: vars.radius.md,
});

export const heading = style({
  color: vars.text.default,
  fontWeight: vars.font.weight.bold,
});

export const body = style({
  margin: 0,
  color: vars.text.muted,
  fontSize: vars.font.size.sm,
});
