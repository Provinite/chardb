import { createVar, style } from "@vanilla-extract/css";
import { cardSurface, focusRing, vars } from "@chardb/ui/theme";

export const card = style([
  cardSurface,
  {
    padding: vars.space.md,
    borderRadius: vars.radius.lg,
    minWidth: 0,
  },
]);

export const sectionTitle = style({
  margin: 0,
  fontSize: vars.font.size.lg,
  fontWeight: vars.font.weight.semibold,
  color: vars.text.default,
});

export const muted = style({
  margin: 0,
  fontSize: vars.font.size.sm,
  color: vars.text.muted,
});

export const statValue = style({
  margin: 0,
  fontSize: vars.font.size.xxl,
  fontWeight: vars.font.weight.bold,
  color: vars.text.default,
  fontVariantNumeric: "tabular-nums",
});

export const statLabel = style({
  margin: 0,
  fontSize: vars.font.size.sm,
  color: vars.text.muted,
});

export const statList = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const field = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  minWidth: 0,
  fontSize: vars.font.size.sm,
  color: vars.text.default,
});

export const input = style([
  focusRing,
  {
    minHeight: vars.size.target.comfortable,
    paddingInline: vars.space.sm,
    border: `${vars.borderWidth.hairline} solid ${vars.border.input}`,
    borderRadius: vars.radius.md,
    background: vars.surface.raised,
    color: vars.text.default,
    font: "inherit",
    fontVariantNumeric: "tabular-nums",
    minWidth: 0,
  },
]);

/** Holds a simulator's result at one size, rolled or not. */
export const result = style({
  minHeight: vars.size.column.sm,
  margin: 0,
  color: vars.text.default,
  fontVariantNumeric: "tabular-nums",
});

export const resultImage = style({
  display: "block",
  width: vars.size.column.xs,
  height: vars.size.column.xs,
  objectFit: "contain",
  flexShrink: 0,
  borderRadius: vars.radius.md,
  background: vars.surface.sunken,
});

export const resultTitle = style({
  margin: 0,
  fontWeight: vars.font.weight.semibold,
});

/** How tall a bar is, as a share of the tallest. */
export const barShare = createVar();

export const chart = style({
  position: "relative",
  display: "flex",
  alignItems: "flex-end",
  gap: vars.borderWidth.hairline,
  height: vars.size.column.md,
  paddingBlockStart: vars.space.md,
  borderBlockEnd: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
});

export const bar = style({
  flex: 1,
  minWidth: 0,
  height: barShare,
  background: vars.action.primary.bg,
  borderStartStartRadius: vars.radius.sm,
  borderStartEndRadius: vars.radius.sm,
});

/** Where the scheduled end falls along the chart. */
export const markerAt = createVar();

export const marker = style({
  position: "absolute",
  insetBlock: 0,
  insetInlineStart: markerAt,
  borderInlineStart: `${vars.borderWidth.thick} dashed ${vars.text.default}`,
});

export const axis = style({
  display: "flex",
  justifyContent: "space-between",
  gap: vars.space.sm,
  fontSize: vars.font.size.xs,
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
});

export const summaryLine = style({
  margin: 0,
  color: vars.text.default,
  fontVariantNumeric: "tabular-nums",
});
