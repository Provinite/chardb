import { style } from "@vanilla-extract/css";
import { focusRing, hover, mq, vars } from "@chardb/ui/theme";

const slide = `${vars.motion.duration.normal} ${vars.motion.easing.standard}`;

/** On `<html>` while the drawer is open, so the page behind it holds still. */
export const scrollLock = style({
  overflow: "hidden",
  // Keeps the space the scrollbar took, so hiding it moves nothing.
  scrollbarGutter: "stable",
});

export const scrim = style({
  position: "fixed",
  inset: 0,
  zIndex: vars.layer.overlay.base,
  background: vars.surface.overlay,
  opacity: 0,
  visibility: "hidden",
  // Closing, `visibility` stays visible for the whole transition, so it turns
  // hidden only once the fade has finished. Opening leaves it out of the
  // transition, so it is visible at once.
  transition: `opacity ${slide}, visibility ${slide}`,
  selectors: {
    "&[data-open]": {
      opacity: 1,
      visibility: "visible",
      transition: `opacity ${slide}`,
    },
  },
  "@media": {
    [mq("md")]: { display: "none" },
  },
});

/**
 * Off-canvas below `md`, a column beside the page from it. Closed, it slides
 * out and then turns `visibility: hidden`, which takes it out of the tab
 * order and the accessibility tree.
 */
export const panel = style({
  position: "fixed",
  insetBlock: 0,
  insetInlineStart: 0,
  // Above its own scrim, inside the overlay layer.
  zIndex: vars.layer.overlay[100],
  display: "flex",
  flexDirection: "column",
  // Leaves a strip of scrim to tap, even at 320px.
  inlineSize: `min(${vars.size.sidebar}, calc(100% - ${vars.size.target.comfortable}))`,
  background: vars.surface.page,
  transform: "translateX(-100%)",
  visibility: "hidden",
  transition: `transform ${slide}, visibility ${slide}`,
  selectors: {
    // Visible at once, so focus can move in as soon as it opens.
    "&[data-open]": {
      transform: "none",
      visibility: "visible",
      transition: `transform ${slide}`,
    },
  },
  "@media": {
    [mq("md")]: {
      position: "sticky",
      top: 0,
      zIndex: vars.layer.page.base,
      flexShrink: 0,
      inlineSize: vars.size.sidebar,
      blockSize: "100vh",
      transform: "none",
      visibility: "visible",
      transition: "none",
    },
  },
});

export const closeRow = style({
  display: "flex",
  justifyContent: "flex-end",
  padding: vars.space.xs,
  "@media": {
    [mq("md")]: { display: "none" },
  },
});

export const closeButton = style([
  focusRing,
  {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minInlineSize: vars.size.target.comfortable,
    minBlockSize: vars.size.target.comfortable,
    padding: 0,
    border: 0,
    borderRadius: vars.radius.md,
    background: "transparent",
    color: vars.text.muted,
    cursor: "pointer",
    "@media": hover({
      "&:hover": { background: vars.surface.raised, color: vars.text.default },
    }),
  },
]);

/** The sidebar inside, filling the rest of the panel's height. */
export const body = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minBlockSize: 0,
});
