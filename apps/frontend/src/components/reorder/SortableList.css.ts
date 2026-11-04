import { createVar, style } from "@vanilla-extract/css";
import { cardSurface, focusRing, vars } from "@chardb/ui/theme";

/** Where dnd-kit has dragged a row to, and how it eases back. */
export const transform = createVar();
export const transition = createVar();

export const list = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const row = style([
  cardSurface,
  {
    display: "flex",
    alignItems: "center",
    gap: vars.space.sm,
    padding: vars.space.sm,
    borderRadius: vars.radius.md,
    transform,
    transition,
    selectors: {
      // Above its neighbours while it passes over them.
      "&[data-dragging]": {
        position: "relative",
        zIndex: vars.layer.page[100],
        boxShadow: vars.shadow.lg,
      },
    },
  },
]);

export const content = style({
  flex: 1,
  minInlineSize: 0,
});

export const handle = style([
  focusRing,
  {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: vars.size.target.comfortable,
    blockSize: vars.size.target.comfortable,
    padding: 0,
    border: 0,
    borderRadius: vars.radius.md,
    background: "transparent",
    color: vars.text.muted,
    cursor: "grab",
    // The handle drags on touch too, so the page must not scroll from it.
    touchAction: "none",
    selectors: {
      "[data-dragging] &": { cursor: "grabbing" },
    },
  },
]);

export const moves = style({
  display: "flex",
  flexShrink: 0,
});
