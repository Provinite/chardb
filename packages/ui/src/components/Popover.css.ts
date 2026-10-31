import { style } from "@vanilla-extract/css";
import { vars } from "../theme/contract.css";
import { floating } from "./floating.css";

export const panel = style([
  floating,
  {
    zIndex: vars.layer.dropdown.base,
    display: "flex",
    flexDirection: "column",
    borderRadius: vars.radius.md,
    selectors: {
      // Focused only as a fallback, when nothing inside takes focus; the
      // panel is not a control, so it gets no ring.
      "&:focus": { outline: "none" },
    },
  },
]);

/**
 * The panel's content, which scrolls when the panel is capped. Inside the
 * panel rather than the panel itself, so the arrow outside its edge is not
 * clipped.
 */
export const body = style({
  flex: 1,
  minBlockSize: 0,
  overflowY: "auto",
  overscrollBehavior: "contain",
  padding: vars.space.md,
});
