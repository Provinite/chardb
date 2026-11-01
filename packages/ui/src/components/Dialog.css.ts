import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "../theme/contract.css";

/** On `<html>` while any dialog is open, so the page behind holds still. */
export const scrollLock = style({
  overflow: "hidden",
});

/**
 * With `scrollLock` when the page had a scrollbar: keeps its space, so hiding
 * it moves nothing.
 */
export const keepGutter = style({
  scrollbarGutter: "stable",
});

/**
 * The fixed layer holding the scrim and the dialog. The dialog sits near the
 * top rather than centred, so a list that grows or shrinks under a search box
 * never moves the box.
 */
export const layer = style({
  position: "fixed",
  inset: 0,
  zIndex: vars.layer.modal.base,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  paddingBlock: vars.space.xxl,
  paddingInline: vars.space.md,
});

export const scrim = style({
  position: "absolute",
  inset: 0,
  background: vars.surface.overlay,
});

export const dialog = style({
  // `<dialog open>` is absolutely positioned and centred by the browser;
  // this one is placed by the layer instead.
  position: "relative",
  inset: "auto",
  margin: 0,
  display: "flex",
  flexDirection: "column",
  inlineSize: "100%",
  maxBlockSize: "100%",
  padding: 0,
  // Transparent, so forced-colour mode draws it in a system colour.
  border: `${vars.borderWidth.hairline} solid transparent`,
  borderRadius: vars.radius.lg,
  background: vars.surface.raised,
  color: vars.text.default,
  boxShadow: vars.shadow.lg,
  overflow: "hidden",
  selectors: {
    // Focused only as a fallback, when nothing inside asked for focus. The
    // dialog is not a control, so it gets no ring.
    "&:focus": { outline: "none" },
  },
});

/** How wide it may grow; narrower screens give it their full width. */
export const width = styleVariants({
  default: { maxInlineSize: vars.size.dialog },
  wide: { maxInlineSize: vars.size.dialogWide },
});

/**
 * The content, padded, scrolling when the dialog is capped to the screen.
 * The command palette brings its own layout and uses none.
 */
export const body = style({
  flex: 1,
  minBlockSize: 0,
  overflowY: "auto",
  overscrollBehavior: "contain",
  padding: vars.space.lg,
});

export const title = style({
  margin: 0,
  fontSize: vars.font.size.xl,
  fontWeight: vars.font.weight.semibold,
  lineHeight: vars.font.lineHeight.tight,
});
