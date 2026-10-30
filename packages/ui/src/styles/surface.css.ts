import { style } from "@vanilla-extract/css";
import { hover } from "../css/media";
import { vars } from "../theme/contract.css";
import { focusRing } from "./focus.css";

/**
 * A card's background. The transparent border is drawn in a system colour
 * under forced colours, where the background alone would vanish.
 */
export const cardSurface = style({
  background: vars.surface.raised,
  border: `${vars.borderWidth.hairline} solid transparent`,
  borderRadius: vars.radius.md,
});

/** A card surface that is itself a control: a link or button card. */
export const interactiveSurface = style([
  cardSurface,
  focusRing,
  {
    cursor: "pointer",
    transition: `background ${vars.motion.duration.fast} ${vars.motion.easing.standard}`,
    "@media": hover({
      "&:hover": { background: vars.surface.raisedHover },
    }),
  },
]);
