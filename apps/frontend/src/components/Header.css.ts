import { style } from "@vanilla-extract/css";
import { focusRing, hover, mq, vars } from "@chardb/ui/theme";

export const header = style({
  background: vars.surface.raised,
  borderBlockEnd: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
});

/**
 * One row that wraps, so a long display name pushes the controls onto a
 * second line instead of past the edge.
 */
export const row = style({
  paddingBlock: vars.space.xs,
  paddingInline: vars.space.sm,
  "@media": {
    [mq("sm")]: { paddingInline: vars.space.md },
  },
});

const control = style([
  focusRing,
  {
    display: "inline-flex",
    alignItems: "center",
    minBlockSize: vars.size.target.comfortable,
    borderRadius: vars.radius.md,
  },
]);

/**
 * Holds the button that opens the navigation drawer; the sidebar sits beside
 * the page from `md`. Hidden on the wrapper, so the button's own `display`
 * never competes with it.
 */
export const menuSlot = style({
  display: "flex",
  "@media": {
    [mq("md")]: { display: "none" },
  },
});

export const logo = style([
  control,
  {
    paddingInline: vars.space.xs,
    color: vars.text.link,
    fontSize: vars.font.size.xl,
    fontWeight: vars.font.weight.bold,
    textDecoration: "none",
  },
]);

/** Create Character and Upload: in the account menu below `sm`. */
export const navLink = style([
  control,
  {
    display: "none",
    paddingInline: vars.space.xs,
    color: vars.text.default,
    fontWeight: vars.font.weight.medium,
    textDecoration: "none",
    "@media": {
      ...hover({ "&:hover": { color: vars.text.link } }),
      [mq("sm")]: { display: "inline-flex" },
    },
  },
]);

/** The theme toggle for a signed-in viewer, which the account menu carries below `sm`. */
export const roomyOnly = style({
  display: "none",
  "@media": {
    [mq("sm")]: { display: "contents" },
  },
});
