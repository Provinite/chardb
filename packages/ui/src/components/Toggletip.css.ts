import { style } from "@vanilla-extract/css";
import { vars } from "../theme/contract.css";
import { focusRing } from "../styles/focus.css";
import { hover } from "../css/media";
import { floating, maxWidth } from "./floating.css";

export const button = style([
  focusRing,
  {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    // The floor rather than the comfortable size: it sits inline beside the
    // thing it explains, and nothing else is in reach of it.
    minInlineSize: vars.size.target.min,
    minBlockSize: vars.size.target.min,
    padding: 0,
    border: 0,
    borderRadius: vars.radius.full,
    background: "transparent",
    color: vars.text.muted,
    cursor: "pointer",
    "@media": hover({
      "&:hover": { color: vars.text.default },
    }),
    selectors: {
      "&[aria-expanded='true']": { color: vars.text.default },
    },
  },
]);

export const bubble = style([
  floating,
  {
    // A step above the dropdown layer, like tooltips: toggletips explain
    // controls inside popovers.
    zIndex: vars.layer.dropdown[100],
    maxInlineSize: `min(${maxWidth}, ${vars.size.column.xl})`,
    paddingBlock: vars.space.sm,
    paddingInline: vars.space.md,
    borderRadius: vars.radius.md,
    fontSize: vars.font.size.sm,
    lineHeight: vars.font.lineHeight.normal,
  },
]);
