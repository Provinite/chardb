import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "../theme/contract.css";
import { loop } from "../css/loop";

export const bar = style({
  position: "fixed",
  // Below a notch or status bar, should the page ever run under one
  // (`viewport-fit=cover`); zero until then.
  insetBlockStart: "env(safe-area-inset-top, 0)",
  insetInline: 0,
  overflow: "hidden",
  // Above the page and nothing else: following a link closes the drawer and
  // any menu it was in, so nothing above the page is open while the next one
  // loads.
  zIndex: vars.layer.sticky.base,
  pointerEvents: "none",
});

const sweep = keyframes({
  from: { transform: "translateX(-100%)" },
  to: { transform: "translateX(400%)" },
});

// A border rather than a background: forced-colour modes drop backgrounds
// but draw borders in a system colour.
export const indicator = style([
  loop({ kind: "essential", keyframes: sweep }),
  {
    inlineSize: "25%",
    borderBlockStart: `${vars.borderWidth.thick} solid ${vars.action.primary.bg}`,
  },
]);
