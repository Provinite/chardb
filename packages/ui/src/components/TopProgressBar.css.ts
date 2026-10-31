import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "../theme/contract.css";
import { loop } from "../css/loop";

export const bar = style({
  position: "fixed",
  insetBlockStart: 0,
  insetInline: 0,
  overflow: "hidden",
  // Above the navigation drawer, which stays open until the next page renders
  // and closes it.
  zIndex: vars.layer.overlay[100],
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
