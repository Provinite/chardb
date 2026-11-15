import { style, styleVariants } from "@vanilla-extract/css";
import { cardSurface, vars } from "@chardb/ui/theme";

export const card = style([
  cardSurface,
  {
    padding: vars.space.md,
    borderRadius: vars.radius.lg,
    minInlineSize: 0,
  },
]);

export const name = style({
  margin: 0,
  minInlineSize: 0,
  overflowWrap: "anywhere",
  color: vars.text.default,
  fontSize: vars.font.size.lg,
  fontWeight: vars.font.weight.semibold,
});

export const hint = style({
  color: vars.text.muted,
  fontFamily: vars.font.family.mono,
  fontSize: vars.font.size.sm,
});

const badge = style({
  paddingInline: vars.space.sm,
  paddingBlock: vars.space.xs,
  border: `${vars.borderWidth.hairline} solid`,
  borderRadius: vars.radius.full,
  fontSize: vars.font.size.xs,
  fontWeight: vars.font.weight.medium,
});

export const status = styleVariants({
  active: [
    badge,
    {
      color: vars.status.success.fg,
      background: vars.status.success.bgSubtle,
      borderColor: vars.status.success.border,
    },
  ],
  expired: [
    badge,
    {
      color: vars.status.warning.fg,
      background: vars.status.warning.bgSubtle,
      borderColor: vars.status.warning.border,
    },
  ],
  revoked: [
    badge,
    {
      color: vars.status.danger.fg,
      background: vars.status.danger.bgSubtle,
      borderColor: vars.status.danger.border,
    },
  ],
});

/** A list read as a list, without bullets or indent. */
export const list = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const grant = style({
  color: vars.text.default,
  fontSize: vars.font.size.sm,
  overflowWrap: "anywhere",
});

export const community = style({
  fontWeight: vars.font.weight.semibold,
});

/** A wrapping row, as `Cluster` lays out, on a `<dl>`, which it cannot be. */
export const dates = style({
  display: "flex",
  flexWrap: "wrap",
  gap: vars.space.md,
  margin: 0,
  color: vars.text.muted,
  fontSize: vars.font.size.sm,
  fontVariantNumeric: "tabular-nums",
});

export const dateTerm = style({
  display: "inline",
  fontWeight: vars.font.weight.medium,
});

export const dateValue = style({
  display: "inline",
  margin: 0,
});

export const empty = style([
  cardSurface,
  {
    margin: 0,
    padding: vars.space.lg,
    borderRadius: vars.radius.lg,
    color: vars.text.muted,
    textAlign: "center",
  },
]);
