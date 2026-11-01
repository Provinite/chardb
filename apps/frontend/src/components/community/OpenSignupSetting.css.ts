import { style } from "@vanilla-extract/css";
import { focusRing, vars } from "@chardb/ui/theme";

export const setting = style({
  marginBlockEnd: vars.space.xl,
});

export const label = style({
  color: vars.text.default,
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.medium,
});

export const select = style([
  focusRing,
  {
    boxSizing: "border-box",
    inlineSize: "100%",
    maxInlineSize: vars.size.dialog,
    minBlockSize: vars.size.target.comfortable,
    paddingInline: vars.space.sm,
    border: `${vars.borderWidth.hairline} solid ${vars.border.input}`,
    borderRadius: vars.radius.md,
    background: vars.surface.page,
    color: vars.text.default,
    fontFamily: vars.font.family.body,
    fontSize: vars.font.size.md,
  },
]);
