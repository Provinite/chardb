import { style } from "@vanilla-extract/css";
import { vars } from "@chardb/ui/theme";

export const footer = style({
  marginBlockStart: "auto",
  paddingBlock: vars.space.lg,
  paddingInline: vars.space.md,
  background: vars.surface.raised,
  borderBlockStart: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
  color: vars.text.muted,
  fontSize: vars.font.size.sm,
  textAlign: "center",
});
