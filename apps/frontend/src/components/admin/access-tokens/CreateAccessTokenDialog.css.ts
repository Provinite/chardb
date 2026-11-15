import { style } from "@vanilla-extract/css";
import { focusRing, vars } from "@chardb/ui/theme";

export const label = style({
  color: vars.text.default,
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.medium,
});

export const help = style({
  margin: 0,
  color: vars.text.muted,
  fontSize: vars.font.size.sm,
});

export const select = style([
  focusRing,
  {
    boxSizing: "border-box",
    inlineSize: "100%",
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

export const grant = style({
  margin: 0,
  padding: vars.space.md,
  minInlineSize: 0,
  border: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
  borderRadius: vars.radius.lg,
});

export const legend = style({
  paddingInline: vars.space.xs,
  color: vars.text.default,
  fontWeight: vars.font.weight.semibold,
  overflowWrap: "anywhere",
});

export const category = style({
  margin: 0,
  color: vars.text.muted,
  fontSize: vars.font.size.xs,
  fontWeight: vars.font.weight.semibold,
  textTransform: "uppercase",
});

export const checkbox = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  minBlockSize: vars.size.target.comfortable,
  color: vars.text.default,
  fontSize: vars.font.size.sm,
  cursor: "pointer",
});

export const checkboxInput = style([
  focusRing,
  {
    flexShrink: 0,
    inlineSize: vars.size.target.min,
    blockSize: vars.size.target.min,
    margin: 0,
    accentColor: vars.action.primary.bg,
  },
]);

/** Reserves the line, so a message coming or going moves nothing. */
export const message = style({
  margin: 0,
  minBlockSize: `calc(${vars.font.size.sm} * ${vars.font.lineHeight.normal})`,
  color: vars.status.danger.fg,
  fontSize: vars.font.size.sm,
});

export const secret = style({
  display: "block",
  padding: vars.space.md,
  borderRadius: vars.radius.md,
  background: vars.surface.sunken,
  color: vars.text.default,
  fontFamily: vars.font.family.mono,
  fontSize: vars.font.size.sm,
  overflowWrap: "anywhere",
});
