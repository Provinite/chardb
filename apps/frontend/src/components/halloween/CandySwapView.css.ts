import { style } from "@vanilla-extract/css";
import {
  cardSurface,
  focusRing,
  hover,
  interactiveSurface,
  vars,
} from "@chardb/ui/theme";

export const page = style({
  paddingBlock: vars.space.xl,
  paddingInline: vars.space.md,
});

/**
 * The page's heading, in the event's night-sky colours like the sidebar's
 * Halloween heading, with how busy the swap is beside it.
 */
export const hero = style({
  paddingBlock: vars.space.lg,
  paddingInline: vars.space.lg,
  background: vars.event.halloween.bg,
  color: vars.event.halloween.fg,
  // Forced colours drop the background: the border keeps the box.
  border: `${vars.borderWidth.hairline} solid transparent`,
  borderBlockEnd: `${vars.borderWidth.thick} solid ${vars.event.halloween.accent}`,
  borderRadius: vars.radius.lg,
});

/** Takes the row; under a column's width the counts wrap below it. */
export const heroText = style({
  flex: `1 1 ${vars.size.column.xl}`,
  minWidth: 0,
});

export const title = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  margin: 0,
  fontSize: vars.font.size.xxl,
  fontWeight: vars.font.weight.bold,
  lineHeight: vars.font.lineHeight.tight,
  color: vars.event.halloween.fg,
});

export const titleIcon = style({
  flexShrink: 0,
  width: vars.font.size.xxl,
  height: vars.font.size.xxl,
  color: vars.event.halloween.accent,
});

export const heroLead = style({
  margin: 0,
  color: vars.event.halloween.fg,
});

export const stats = style({
  flexShrink: 0,
});

export const stat = style({
  margin: 0,
  color: vars.event.halloween.fg,
  fontSize: vars.font.size.sm,
});

export const statValue = style({
  fontSize: vars.font.size.xxl,
  fontWeight: vars.font.weight.bold,
  fontVariantNumeric: "tabular-nums",
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

/** "You can take" and "All", one pressed at a time. */
export const filter = style({
  display: "inline-flex",
  padding: vars.space.xs,
  gap: vars.space.xs,
  border: `${vars.borderWidth.hairline} solid ${vars.border.input}`,
  borderRadius: vars.radius.md,
});

export const filterOption = style([
  focusRing,
  {
    minHeight: vars.size.target.min,
    paddingInline: vars.space.sm,
    border: `${vars.borderWidth.hairline} solid transparent`,
    borderRadius: vars.radius.sm,
    background: "none",
    color: vars.text.muted,
    fontSize: vars.font.size.sm,
    fontWeight: vars.font.weight.semibold,
    fontVariantNumeric: "tabular-nums",
    cursor: "pointer",
    selectors: {
      '&[aria-pressed="true"]': {
        background: vars.action.primary.bgSubtle,
        borderColor: vars.action.primary.border,
        color: vars.text.default,
      },
      "&:disabled": {
        cursor: "not-allowed",
      },
    },
    "@media": {
      ...hover({
        '&:hover:not(:disabled):not([aria-pressed="true"])': {
          background: vars.surface.raisedHover,
          color: vars.text.default,
        },
      }),
    },
  },
]);

export const card = style([
  cardSurface,
  {
    padding: vars.space.md,
    borderRadius: vars.radius.lg,
  },
]);

/** An offer you cannot take: set back into the page rather than raised. */
export const cardOut = style({
  padding: vars.space.md,
  border: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
  borderRadius: vars.radius.lg,
  background: vars.surface.page,
});

/** Stands in for a card while the offers load, at a card's footprint. */
export const placeholder = style([
  card,
  {
    background: vars.surface.sunken,
    minHeight: vars.size.column.md,
  },
]);

/**
 * Holds an offer card's button at the card's foot whatever the row's
 * height. A wrapper, because `Button` sets its own margin.
 */
export const cardAction = style({
  display: "grid",
  marginBlockStart: "auto",
});

/** The host of a house offer. */
export const offerFrom = style({
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.semibold,
  color: vars.text.default,
});

/** A section on its own surface: the offer being made. */
export const panel = style([
  cardSurface,
  {
    padding: vars.space.lg,
    borderRadius: vars.radius.lg,
  },
]);

export const panelFooter = style({
  paddingBlockStart: vars.space.md,
  borderBlockStart: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
});

/** Where a list would be, with nothing in it yet. */
export const empty = style({
  padding: vars.space.md,
  border: `${vars.borderWidth.thick} dashed ${vars.border.default}`,
  borderRadius: vars.radius.lg,
});

export const emptyTitle = style({
  margin: 0,
  fontWeight: vars.font.weight.semibold,
  color: vars.text.default,
});

/** How many offers you have open, of the most you may. */
export const tally = style({
  fontSize: vars.font.size.sm,
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
});

/** One entry in a side list: an open offer or a trade. */
export const row = style([
  cardSurface,
  {
    padding: vars.space.sm,
    borderRadius: vars.radius.md,
    minWidth: 0,
  },
]);

/** Stands in for a recent swap while the feed loads, at a row's footprint. */
export const rowPlaceholder = style([
  row,
  {
    background: vars.surface.sunken,
    minHeight: vars.size.column.xs,
  },
]);

export const feedNames = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: vars.space.xs,
  margin: 0,
});

export const feedIcon = style({
  flexShrink: 0,
  width: vars.font.size.md,
  height: vars.font.size.md,
  color: vars.text.muted,
});

export const name = style({
  fontWeight: vars.font.weight.semibold,
  color: vars.text.default,
  overflowWrap: "anywhere",
});

export const time = style({
  fontSize: vars.font.size.sm,
  color: vars.text.muted,
});

export const candy = style({
  display: "block",
  width: vars.size.target.comfortable,
  height: vars.size.target.comfortable,
  objectFit: "contain",
});

export const smallCandy = style({
  display: "block",
  width: vars.size.target.min,
  height: vars.size.target.min,
  objectFit: "contain",
});

export const arrow = style({
  flexShrink: 0,
  color: vars.text.muted,
});

/** Between what the offer gives and what it asks, level with the slots. */
export const composeArrow = style([
  arrow,
  {
    marginBlockEnd: vars.space.md,
  },
]);

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
  border: `${vars.borderWidth.thick} dashed ${vars.border.input}`,
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

/** The empty slot for the candy asked for, which opens the picker. */
export const slotButton = style([
  slot,
  focusRing,
  {
    background: "none",
    color: vars.text.muted,
    cursor: "pointer",
  },
]);

/**
 * An icon in a candy's place, centred in its footprint: the empty slot's
 * plus, or the mark for any kind of candy.
 */
export const glyph = style([
  candy,
  {
    display: "grid",
    placeItems: "center",
    color: vars.text.muted,
  },
]);

export const glyphIcon = style({
  width: vars.size.target.min,
  height: vars.size.target.min,
});

/** A candy in the picker; the one asked for has a coloured border. */
export const pickCandy = style([
  trayCandy,
  {
    borderWidth: vars.borderWidth.thick,
    selectors: {
      '&[aria-pressed="true"]': {
        borderColor: vars.action.primary.bg,
      },
    },
  },
]);
