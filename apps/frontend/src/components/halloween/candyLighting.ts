/**
 * The light over a candy board, and the shadow it casts from each candy.
 *
 * The light sits over the board at a point in a unit circle centred on it
 * (`x`, `y`; y down, as on screen), at a `height`. A shadow falls away from
 * it, as long as the light is far to the side over how high it hangs, so a
 * low light off to one side throws long shadows and one overhead throws them
 * straight down. A longer shadow is softer and fainter. The light's
 * `intensity` darkens and sharpens every shadow without changing its length:
 * at 0.5 shadows are as above, at 1 twice as dark and half as soft, at 0 the
 * other way. A coloured light colours the whole board under it.
 *
 * Lengths are in `cqw`, hundredths of the board's width -- the board is a
 * size container -- so a shared board looks the same on any screen. The
 * limits mirror the backend's (candy-board.schema.ts).
 */
import type { CSSProperties } from "react";
import type { HalloweenCandyLighting } from "../../generated/graphql";
import { BOARD_ASPECT } from "./candyBoard";

export type Lighting = Omit<HalloweenCandyLighting, "__typename">;

export const LIGHT_HEIGHT_MIN = 0.1;
export const LIGHT_HEIGHT_MAX = 1;

/** Close to the fixed shadow candies had before lighting: a little way down. */
export const DEFAULT_LIGHTING: Lighting = {
  x: 0,
  y: -0.2,
  height: 0.9,
  intensity: 0.5,
  colour: null,
  colourStrength: 0,
  spotlight: 0,
  cone: 0.5,
};

/** How long a shadow is, in cqw, for a light one radius out at height 1. */
const SHADOW_SCALE = 2;
/** The longest a shadow gets, in cqw: past it, candies' shadows would cross. */
export const MAX_SHADOW_LENGTH = 8;

export interface Shadow {
  /** The offset, in cqw, in the candy's own (rotated) axes. */
  dx: number;
  dy: number;
  blur: number;
  opacity: number;
}

const between = (min: number, max: number, n: number) =>
  Math.min(max, Math.max(min, n));

export function clampLighting(lighting: Lighting): Lighting {
  const { x, y, height, intensity, colourStrength, spotlight, cone } = lighting;
  const reach = Math.hypot(x, y);
  const inside = reach > 1 ? 1 / reach : 1;
  return {
    ...lighting,
    x: x * inside,
    y: y * inside,
    height: between(LIGHT_HEIGHT_MIN, LIGHT_HEIGHT_MAX, height),
    intensity: between(0, 1, intensity),
    colourStrength: between(0, 1, colourStrength),
    spotlight: between(0, 1, spotlight),
    cone: between(0, 1, cone),
  };
}

/**
 * The narrowest and widest beam's pool, in hundredths of the board's width,
 * under a light at height 1.
 */
const CONE_RADIUS_MIN = 15;
const CONE_RADIUS_MAX = 100;
/** How dark the board gets outside the pool at full spotlight. */
const SPOTLIGHT_DARKNESS_MAX = 0.85;

export interface Spotlight {
  /** The pool's centre, in percent of the board's width and height. */
  x: number;
  y: number;
  /** Fully lit out to here, in hundredths of the board's width... */
  lit: number;
  /** ...then darkening to here, and dark past it. */
  radius: number;
  darkness: number;
}

/**
 * The pool of light a spotlight throws, under the light: as wide as its
 * cone, wider the higher it hangs, with its edge softened over the outer
 * third. Null for a board lit evenly.
 */
export function spotlightOf(
  lighting: Lighting | null | undefined,
): Spotlight | null {
  if (!lighting || lighting.spotlight <= 0) return null;
  const { x, y, height, spotlight, cone } = clampLighting(lighting);
  const radius =
    (CONE_RADIUS_MIN + (CONE_RADIUS_MAX - CONE_RADIUS_MIN) * cone) *
    (0.5 + 0.5 * height);
  return {
    x: 50 + x * 50,
    y: 50 + y * 50,
    lit: (radius * 2) / 3,
    radius,
    darkness: SPOTLIGHT_DARKNESS_MAX * spotlight,
  };
}

/**
 * The spotlight as a layer over a board-shaped surface; null for none. The
 * pool is an ellipse sized in percent of the surface's width and height,
 * which on a surface of the board's shape is a circle at any size.
 */
export function spotlightLayer(
  lighting: Lighting | null | undefined,
): CSSProperties | null {
  const pool = spotlightOf(lighting);
  if (!pool) return null;
  const across = round(pool.radius);
  const down = round(pool.radius * BOARD_ASPECT);
  const litShare = round((pool.lit / pool.radius) * 100);
  return {
    backgroundImage: `radial-gradient(${across}% ${down}% at ${round(pool.x)}% ${round(pool.y)}%, rgba(0, 0, 0, 0) ${litShare}%, rgba(0, 0, 0, ${round(pool.darkness)}) 100%)`,
  };
}

/**
 * The light's colour, as a layer over the whole board -- candies,
 * background and shadows -- multiplied in as coloured light is; null for a
 * white light.
 */
export function lightWash(
  lighting: Lighting | null | undefined,
): CSSProperties | null {
  if (!lighting?.colour || lighting.colourStrength <= 0) return null;
  return {
    backgroundColor: lighting.colour,
    opacity: lighting.colourStrength,
    mixBlendMode: "multiply",
  };
}

/** The shadow the light casts from a candy turned `rotation` degrees. */
export function shadowOf(lighting: Lighting, rotation: number): Shadow {
  const { x, y, height, intensity } = clampLighting(lighting);
  const reach = Math.hypot(x, y);
  const length = Math.min(MAX_SHADOW_LENGTH, (SHADOW_SCALE * reach) / height);
  // Away from the light, on the board.
  const boardX = reach === 0 ? 0 : (-x / reach) * length;
  const boardY = reach === 0 ? 0 : (-y / reach) * length;
  // A filter turns with the element it is on, so the offset is turned back
  // by the candy's own rotation (clockwise on screen) to land on the board's.
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  // 1 at the usual intensity, from a half to double either side of it.
  const strength = 2 ** (2 * intensity - 1);
  return {
    dx: cos * boardX + sin * boardY,
    dy: cos * boardY - sin * boardX,
    blur: (0.5 + 0.25 * length) / strength,
    opacity: Math.min(1, between(0.2, 0.45, 0.45 - 0.025 * length) * strength),
  };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** A candy's shadow as a CSS filter; the default light when none is set. */
export function shadowFilter(
  lighting: Lighting | null | undefined,
  rotation: number,
): string {
  const { dx, dy, blur, opacity } = shadowOf(
    lighting ?? DEFAULT_LIGHTING,
    rotation,
  );
  return `drop-shadow(${round(dx)}cqw ${round(dy)}cqw ${round(blur)}cqw rgba(0, 0, 0, ${round(opacity)}))`;
}
