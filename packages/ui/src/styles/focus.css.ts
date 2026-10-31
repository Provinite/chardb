import { style } from "@vanilla-extract/css";
import { vars } from "../theme/contract.css";

/**
 * The focus ring, on `:focus-visible`. An outline, so forced-colour mode
 * keeps it; offset so it sits on the surface around the control.
 */
export const focusRing = style({
  selectors: {
    "&:focus-visible": {
      outline: `${vars.borderWidth.focus} solid ${vars.border.focus}`,
      outlineOffset: vars.size.focusOffset,
    },
  },
});
