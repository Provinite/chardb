import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { focusRing, hover, vars } from "@chardb/ui/theme";

export const row = recipe({
  base: {
    position: "relative",
    // Keeps the actor links' z-index step inside the row, so they cannot rise
    // above the bell's panel when it opens over the notifications page.
    isolation: "isolate",
    display: "flex",
    alignItems: "flex-start",
    gap: vars.space.md,
    padding: `${vars.space.sm} ${vars.space.md}`,
    borderBottom: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
    selectors: {
      "&:last-child": { borderBottom: "none" },
    },
  },
  variants: {
    /* Unread is a tint rather than a dot, so a run of them reads as a block. */
    unread: {
      true: { background: vars.action.primary.bgSubtle },
      false: { background: "transparent" },
    },
    clickable: {
      true: {
        cursor: "pointer",
        "@media": hover({
          "&:hover": { background: vars.surface.raisedHover },
        }),
      },
      false: { cursor: "default" },
    },
  },
});

/**
 * The link to what the notification is about. Its `::after` stretches over
 * the whole row, so a tap anywhere on it follows the link, without wrapping
 * the actor's link inside this one: an `<a>` inside an `<a>` is invalid, and
 * browsers split it apart.
 */
export const subjectLink = style({
  color: "inherit",
  textDecoration: "none",
  selectors: {
    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
    },
    "&:focus-visible": { outline: "none" },
    // Inside the row, so a scrolling list around it cannot clip the ring.
    "&:focus-visible::after": {
      outline: `${vars.borderWidth.focus} solid ${vars.border.focus}`,
      outlineOffset: `calc(-1 * ${vars.borderWidth.focus})`,
    },
  },
});

/**
 * The actor's links, above the stretched subject link. Both are positioned;
 * without the step, the subject link's overlay comes later in the source and
 * would take their clicks.
 */
const aboveSubjectLink = style({
  position: "relative",
  zIndex: vars.layer.page[100],
});

export const avatarLink = style([
  aboveSubjectLink,
  focusRing,
  {
    display: "block",
    flexShrink: 0,
    borderRadius: vars.radius.full,
  },
]);

/** The actor's name, linked or not. */
export const actorName = style({
  fontWeight: vars.font.weight.semibold,
});

export const actorLink = style([
  actorName,
  aboveSubjectLink,
  focusRing,
  {
    color: "inherit",
    textDecoration: "none",
    "@media": hover({
      "&:hover": { textDecoration: "underline" },
    }),
  },
]);

export const body = style({
  minWidth: 0,
  flex: 1,
});

export const sentence = style({
  fontSize: vars.font.size.sm,
  color: vars.text.default,
  lineHeight: vars.font.lineHeight.normal,
});

export const excerpt = style({
  marginTop: vars.space.xs,
  fontSize: vars.font.size.sm,
  color: vars.text.muted,
  overflowWrap: "anywhere",
});

export const meta = style({
  marginTop: vars.space.xs,
  fontSize: vars.font.size.xs,
  color: vars.text.muted,
});
