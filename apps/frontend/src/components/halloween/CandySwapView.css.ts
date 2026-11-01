import { style } from "@vanilla-extract/css";
import {
  cardSurface,
  focusRing,
  interactiveSurface,
  vars,
} from "@chardb/ui/theme";

export const page = style({
  paddingBlock: vars.space.xl,
  paddingInline: vars.space.md,
});

export const title = style({
  margin: 0,
  fontSize: vars.font.size.xxl,
  fontWeight: vars.font.weight.bold,
  color: vars.text.default,
});

export const sectionTitle = style({
  margin: 0,
  fontSize: vars.font.size.xl,
  fontWeight: vars.font.weight.semibold,
  color: vars.text.default,
});

export const muted = style({
  margin: 0,
  color: vars.text.muted,
});

export const list = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const card = style([
  cardSurface,
  {
    padding: vars.space.md,
    borderRadius: vars.radius.lg,
  },
]);

/** Stands in for a card while the offers load, at a card's footprint. */
export const placeholder = style([
  card,
  {
    background: vars.surface.sunken,
    minHeight: vars.size.column.xs,
  },
]);

export const candy = style({
  display: "block",
  width: vars.size.target.comfortable,
  height: vars.size.target.comfortable,
  objectFit: "contain",
});

export const label = style({
  margin: 0,
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.semibold,
  color: vars.text.muted,
});

/** A candy in the tray, which adds one of its kind to the offer. */
export const trayCandy = style([
  interactiveSurface,
  {
    position: "relative",
    display: "inline-flex",
    padding: vars.space.xs,
    borderColor: vars.border.default,
    selectors: {
      "&:disabled": {
        cursor: "not-allowed",
        filter: "grayscale(1)",
      },
    },
  },
]);

export const count = style({
  position: "absolute",
  insetBlockEnd: 0,
  insetInlineEnd: 0,
  paddingInline: vars.space.xs,
  borderRadius: vars.radius.full,
  background: vars.surface.raised,
  color: vars.text.default,
  fontSize: vars.font.size.xs,
  fontVariantNumeric: "tabular-nums",
});

/**
 * One of the three places in the offer, filled or not: the row keeps its
 * size as candies go in and out.
 */
export const slot = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: vars.space.xs,
  border: `${vars.borderWidth.thick} dashed ${vars.border.default}`,
  borderRadius: vars.radius.md,
});

export const filledSlot = style([
  slot,
  focusRing,
  {
    borderStyle: "solid",
    background: vars.surface.raised,
    cursor: "pointer",
  },
]);

export const select = style([
  focusRing,
  {
    minHeight: vars.size.target.comfortable,
    paddingInline: vars.space.sm,
    border: `${vars.borderWidth.hairline} solid ${vars.border.input}`,
    borderRadius: vars.radius.md,
    background: vars.surface.raised,
    color: vars.text.default,
    font: "inherit",
  },
]);

export const tradeWith = style({
  fontWeight: vars.font.weight.semibold,
  color: vars.text.default,
});

export const smallCandy = style({
  display: "block",
  width: vars.size.target.min,
  height: vars.size.target.min,
  objectFit: "contain",
});
