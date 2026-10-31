import { createVar, style } from "@vanilla-extract/css";

// The values come from the board's own settings at runtime -- a tint the
// owner picked, a spotlight's position -- so they arrive as variables; see
// `layerVars` in ./layers.ts. An unset variable leaves its property at its
// initial value: no colour, full opacity, normal blending, no image.
export const backgroundColor = createVar();
export const opacity = createVar();
export const blendMode = createVar();
export const backgroundImage = createVar();
export const left = createVar();
export const top = createVar();
export const width = createVar();
export const transform = createVar();

const painted = {
  backgroundColor,
  opacity,
  mixBlendMode: blendMode,
  backgroundImage,
  pointerEvents: "none",
} as const;

/** A layer over the whole surface: a tint, a dim, the light's colour. */
export const fill = style({
  ...painted,
  position: "absolute",
  inset: 0,
});

/** A spotlight's square, centred on its pool and turned to the beam. */
export const pool = style({
  ...painted,
  position: "absolute",
  left,
  top,
  width,
  aspectRatio: "1",
  transform,
});
