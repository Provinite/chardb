import { keyframes, style } from "@vanilla-extract/css";
import { loop } from "../css/loop";
import { vars } from "../theme/contract.css";

const spin = keyframes({ to: { transform: "rotate(1turn)" } });

// A border rather than an SVG stroke or background: forced-colour modes draw
// borders in a system colour, so the spinner survives them.
export const spinner = style([
  loop({ kind: "essential", keyframes: spin }),
  {
    display: "inline-block",
    flexShrink: 0,
    boxSizing: "border-box",
    inlineSize: vars.size.spinner,
    blockSize: vars.size.spinner,
    border: `${vars.borderWidth.thick} solid currentColor`,
    borderInlineEndColor: "transparent",
    borderRadius: vars.radius.full,
  },
]);
