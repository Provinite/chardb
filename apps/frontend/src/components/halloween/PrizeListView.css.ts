import { style } from "@vanilla-extract/css";
import { cardSurface, focusRing, vars } from "@chardb/ui/theme";

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
    minWidth: 0,
  },
]);

/** Square, so every card is the same height whatever its picture. */
export const picture = style({
  display: "block",
  width: "100%",
  aspectRatio: "1",
  objectFit: "contain",
  borderRadius: vars.radius.md,
  background: vars.surface.sunken,
});

/** A won-out prize's picture, greyed so the ones still to win stand out. */
export const pictureWon = style({
  filter: "grayscale(1)",
});

/** Stands in for a prize with no picture, at a picture's footprint. */
export const noPicture = style([
  picture,
  {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: vars.text.default,
  },
]);

export const noPictureIcon = style({
  width: vars.size.target.comfortable,
  height: vars.size.target.comfortable,
});

export const prizeName = style({
  margin: 0,
  fontSize: vars.font.size.md,
  fontWeight: vars.font.weight.semibold,
  color: vars.text.default,
  overflowWrap: "anywhere",
});

export const stock = style({
  margin: 0,
  fontSize: vars.font.size.sm,
  color: vars.text.muted,
  fontVariantNumeric: "tabular-nums",
});

export const allWon = style({
  margin: 0,
  alignSelf: "flex-start",
  paddingBlock: vars.space.xs,
  paddingInline: vars.space.sm,
  borderRadius: vars.radius.full,
  border: `${vars.borderWidth.hairline} solid ${vars.status.info.border}`,
  background: vars.status.info.bgSubtle,
  color: vars.status.info.fg,
  fontSize: vars.font.size.xs,
  fontWeight: vars.font.weight.semibold,
});

export const link = style([
  focusRing,
  {
    fontSize: vars.font.size.sm,
    color: vars.text.link,
  },
]);

export const win = style([
  cardSurface,
  {
    display: "flex",
    gap: vars.space.sm,
    alignItems: "center",
    padding: vars.space.sm,
    borderRadius: vars.radius.md,
    minWidth: 0,
  },
]);

/** Stands in for a prize card while the list loads, at a card's footprint. */
export const cardPlaceholder = style([
  card,
  {
    background: vars.surface.sunken,
    aspectRatio: "3 / 4",
  },
]);

/** Stands in for a win while the feed loads, at a win's footprint. */
export const winPlaceholder = style([
  win,
  {
    background: vars.surface.sunken,
    minHeight: vars.size.column.xs,
  },
]);

export const winPicture = style({
  flexShrink: 0,
  width: vars.size.target.comfortable,
  height: vars.size.target.comfortable,
  objectFit: "contain",
  borderRadius: vars.radius.sm,
  background: vars.surface.sunken,
});

export const winText = style({
  minWidth: 0,
  flex: 1,
});

export const winPrize = style({
  margin: 0,
  fontWeight: vars.font.weight.semibold,
  color: vars.text.default,
  overflowWrap: "anywhere",
});

export const winDetail = style({
  margin: 0,
  fontSize: vars.font.size.sm,
  color: vars.text.muted,
  overflowWrap: "anywhere",
});
