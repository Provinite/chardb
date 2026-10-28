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
  /**
   * The pool's centre, in percent of the board's width and height: across
   * the board from the light, where its beam goes.
   */
  x: number;
  y: number;
  /** Fully lit out to here, in hundredths of the board's width... */
  lit: number;
  /** ...then darkening to here, and dark past it, across the beam. */
  radius: number;
  /** How many times longer the pool is along the beam than across it. */
  stretch: number;
  /**
   * Which way the beam runs, away from the light, in degrees clockwise from
   * the board's right.
   */
  angle: number;
  darkness: number;
}

/**
 * The pool of light a spotlight throws: as wide as its cone, wider the
 * higher it hangs, with its edge softened over the outer third. A light off
 * to one side shines across the board, so its pool lands as far out on the
 * other side -- the way its shadows fall -- and lands at a slant, stretched
 * along the beam by as far out as the light is over how high it hangs, as
 * the shadows are long. Null for a board lit evenly.
 */
export function spotlightOf(
  lighting: Lighting | null | undefined,
): Spotlight | null {
  if (!lighting || lighting.spotlight <= 0) return null;
  const { x, y, height, spotlight, cone } = clampLighting(lighting);
  const radius =
    (CONE_RADIUS_MIN + (CONE_RADIUS_MAX - CONE_RADIUS_MIN) * cone) *
    (0.5 + 0.5 * height);
  const reach = Math.hypot(x, y);
  return {
    x: 50 - x * 50,
    y: 50 - y * 50,
    lit: (radius * 2) / 3,
    radius,
    stretch: Math.hypot(1, reach / height),
    angle: reach === 0 ? 0 : (Math.atan2(-y, -x) * 180) / Math.PI,
    darkness: SPOTLIGHT_DARKNESS_MAX * spotlight,
  };
}

/** How many board widths across the spotlight's square is: enough to cover
 * the board from a pool anywhere on it, however it is turned. */
const SPOTLIGHT_SQUARE = 3;

/**
 * The spotlight as a layer over a board-shaped surface, which must clip it;
 * null for none. A gradient's ellipse cannot be turned, so the gradient is
 * drawn on a square centred on the pool and the square is turned to the
 * beam.
 */
export function spotlightLayer(
  lighting: Lighting | null | undefined,
): CSSProperties | null {
  const pool = spotlightOf(lighting);
  if (!pool) return null;
  const { square, ellipse, litShare } = poolSquare(pool);
  return {
    ...square,
    backgroundImage: `radial-gradient(${ellipse} at 50% 50%, rgba(0, 0, 0, 0) ${litShare}%, rgba(0, 0, 0, ${round(pool.darkness)}) 100%)`,
  };
}

/** How bright a spotlight's pool glows at its middle, at full intensity. */
const GLOW_MAX = 0.8;

/**
 * The light inside a spotlight's pool, as bright as the light is intense:
 * brightest in the middle and gone by the pool's lit edge, in the light's
 * colour or white. Softly blended, so it lifts what is there without washing
 * it out. Null with no spotlight, or no intensity.
 */
export function spotlightGlow(
  lighting: Lighting | null | undefined,
): CSSProperties | null {
  const pool = spotlightOf(lighting);
  if (!pool || !lighting || lighting.intensity <= 0) return null;
  const { square, ellipse, litShare } = poolSquare(pool);
  // From white toward the light's colour as far as it colours, so the glow
  // changes as smoothly as the colour does.
  const strength = lighting.colour ? between(0, 1, lighting.colourStrength) : 0;
  const rgb = channelsOf(lighting.colour ?? "#ffffff")
    .map((c) => Math.round(255 + (c - 255) * strength))
    .join(", ");
  const alpha = round(GLOW_MAX * Math.min(1, lighting.intensity));
  return {
    ...square,
    mixBlendMode: "soft-light",
    backgroundImage: `radial-gradient(${ellipse} at 50% 50%, rgba(${rgb}, ${alpha}) 0%, rgba(${rgb}, 0) ${litShare}%)`,
  };
}

/**
 * Where a pool's square goes and how its ellipse is sized on it: centred on
 * the pool, turned to the beam, its ellipse in percent of the square.
 */
function poolSquare(pool: Spotlight): {
  square: CSSProperties;
  ellipse: string;
  litShare: number;
} {
  const across = pool.radius / SPOTLIGHT_SQUARE;
  const along = across * pool.stretch;
  return {
    square: {
      left: `${round(pool.x)}%`,
      top: `${round(pool.y)}%`,
      width: `${SPOTLIGHT_SQUARE * 100}%`,
      aspectRatio: "1",
      transform: `translate(-50%, -50%) rotate(${pool.angle.toFixed(3)}deg)`,
    },
    ellipse: `${round(along)}% ${round(across)}%`,
    litShare: round((pool.lit / pool.radius) * 100),
  };
}

/** "#f97316" -> [249, 115, 22]. */
const channelsOf = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

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
