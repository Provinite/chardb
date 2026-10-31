import type { StyleRule } from "@vanilla-extract/css";
import { vars } from "../theme/contract.css";
import { reducedMotionQuery } from "./media";

interface LoopBase {
  /** Name from `keyframes()`. */
  keyframes: string;
  /** An easing token; defaults to `linear`. */
  easing?: string;
}

/** Shows something is happening, such as a spinner. Slows under reduced motion, never stops. */
interface EssentialLoop extends LoopBase {
  kind: "essential";
}

/** Ornament, such as a shimmer. Stops under reduced motion. */
interface DecorativeLoop extends LoopBase {
  kind: "decorative";
  /** A motion duration token for one cycle; defaults to `motion.duration.essential`. */
  duration?: string;
}

/**
 * An animation that repeats forever, as a style rule to compose:
 * `style([loop({ kind: "essential", keyframes: spin }), { … }])`.
 *
 * Ordinary duration tokens drop to 0.01ms under reduced motion, which would
 * make a loop flicker, so essential loops always run on
 * `motion.duration.essential` and decorative loops stop instead.
 *
 * A rule rather than a class: calling `style()` here would import the
 * vanilla-extract runtime, and `@chardb/ui` re-exports this file, so every
 * bundle that imports a component would ship it.
 */
export const loop = (options: EssentialLoop | DecorativeLoop): StyleRule => ({
  animationName: options.keyframes,
  animationDuration:
    options.kind === "decorative" && options.duration
      ? options.duration
      : vars.motion.duration.essential,
  animationTimingFunction: options.easing ?? vars.motion.easing.linear,
  animationIterationCount: "infinite",
  ...(options.kind === "decorative" && {
    "@media": { [reducedMotionQuery]: { animationName: "none" } },
  }),
});
