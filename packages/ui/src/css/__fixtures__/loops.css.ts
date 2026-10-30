import { keyframes } from "@vanilla-extract/css";
import { vars } from "../../theme/contract.css";
import { loop } from "../loop";

const spin = keyframes({ to: { transform: "rotate(1turn)" } });

export const spinner = loop({ kind: "essential", keyframes: spin });

export const shimmer = loop({
  kind: "decorative",
  keyframes: spin,
  duration: vars.motion.duration.slow,
  easing: vars.motion.easing.standard,
});

export const pulse = loop({ kind: "decorative", keyframes: spin });
