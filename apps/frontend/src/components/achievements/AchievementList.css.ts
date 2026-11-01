import { style } from "@vanilla-extract/css";
import { cardSurface, vars } from "@chardb/ui/theme";

export const list = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
});

export const item = style([
  cardSurface,
  {
    padding: vars.space.md,
    borderRadius: vars.radius.lg,
    minWidth: 0,
  },
]);

export const picture = style({
  width: vars.size.achievement,
  height: vars.size.achievement,
  objectFit: "contain",
  flexShrink: 0,
});

export const text = style({
  flex: 1,
  minWidth: 0,
});

export const name = style({
  margin: 0,
  fontSize: vars.font.size.md,
  fontWeight: vars.font.weight.semibold,
  color: vars.text.default,
});

export const description = style({
  margin: 0,
  fontSize: vars.font.size.sm,
  color: vars.text.default,
});

export const meta = style({
  margin: 0,
  fontSize: vars.font.size.xs,
  color: vars.text.muted,
});
