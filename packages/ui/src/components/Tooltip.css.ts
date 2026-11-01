import { style } from "@vanilla-extract/css";
import { vars } from "../theme/contract.css";
import { floating, maxWidth } from "./floating.css";

export const tooltip = style([
  floating,
  {
    // A step above the dropdown layer: tooltips name controls inside
    // popovers, and must not be drawn under the popover they sit in.
    zIndex: vars.layer.dropdown[100],
    // Short labels; a long one wraps rather than running across the screen.
    maxInlineSize: `min(${maxWidth}, ${vars.size.column.xl})`,
    paddingBlock: vars.space.xs,
    paddingInline: vars.space.sm,
    borderRadius: vars.radius.sm,
    fontSize: vars.font.size.sm,
    lineHeight: vars.font.lineHeight.tight,
  },
]);
