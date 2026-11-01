import { style } from "@vanilla-extract/css";
import { focusRing, vars } from "@chardb/ui/theme";

export const message = style({
  color: vars.text.muted,
  fontSize: vars.font.size.md,
  lineHeight: vars.font.lineHeight.normal,
});

export const phraseLabel = style({
  display: "block",
  color: vars.text.muted,
  fontSize: vars.font.size.sm,
});

export const phraseInput = style([
  focusRing,
  {
    display: "block",
    boxSizing: "border-box",
    inlineSize: "100%",
    minBlockSize: vars.size.target.comfortable,
    marginBlockStart: vars.space.xs,
    paddingInline: vars.space.sm,
    border: `${vars.borderWidth.hairline} solid ${vars.border.input}`,
    borderRadius: vars.radius.md,
    background: vars.surface.page,
    color: vars.text.default,
    fontFamily: vars.font.family.body,
    fontSize: vars.font.size.md,
  },
]);
