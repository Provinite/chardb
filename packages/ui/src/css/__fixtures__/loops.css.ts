import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "../../theme/contract.css";
import { loop } from "../loop";

const spin = keyframes({ to: { transform: "rotate(1turn)" } });

export const spinner = style(loop({ kind: "essential", keyframes: spin }));

export const shimmer = style(
  loop({
    kind: "decorative",
    keyframes: spin,
    duration: vars.motion.duration.slow,
    easing: vars.motion.easing.standard,
  }),
);

export const pulse = style(loop({ kind: "decorative", keyframes: spin }));
