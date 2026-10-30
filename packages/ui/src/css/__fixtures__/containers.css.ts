import { createContainer, style } from "@vanilla-extract/css";
import { vars } from "../../theme/contract.css";
import { cq } from "../container";

export const panel = createContainer();

// Written largest-first on purpose: cq() must reorder them. 30.5 rather than
// 30 because JavaScript already orders integer-like keys ascending.
export const body = style({
  "@container": cq(panel, {
    48: { gap: vars.space.lg },
    30.5: { gap: vars.space.md },
  }),
});
