/**
 * The light over a candy board, and the shadow it casts from each candy.
 *
 * The light sits over the board at a point in a unit circle centred on it
 * (`x`, `y`; y down, as on screen), at a `height`. A shadow falls away from
 * it, as long as the light is far to the side over how high it hangs, so a
 * low light off to one side throws long shadows and one overhead throws them
 * straight down. A longer shadow is softer and fainter.
 *
 * Lengths are in `cqw`, hundredths of the board's width -- the board is a
 * size container -- so a shared board looks the same on any screen. The
 * limits mirror the backend's (candy-board.schema.ts).
 */
import type { HalloweenCandyLighting } from "../../generated/graphql";

export type Lighting = Omit<HalloweenCandyLighting, "__typename">;

export const LIGHT_HEIGHT_MIN = 0.1;
export const LIGHT_HEIGHT_MAX = 1;

/** Close to the fixed shadow candies had before lighting: a little way down. */
export const DEFAULT_LIGHTING: Lighting = { x: 0, y: -0.2, height: 0.9 };

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

export function clampLighting({ x, y, height }: Lighting): Lighting {
  const reach = Math.hypot(x, y);
  const inside = reach > 1 ? 1 / reach : 1;
  return {
    x: x * inside,
    y: y * inside,
    height: Math.min(LIGHT_HEIGHT_MAX, Math.max(LIGHT_HEIGHT_MIN, height)),
  };
}

/** The shadow the light casts from a candy turned `rotation` degrees. */
export function shadowOf(lighting: Lighting, rotation: number): Shadow {
  const { x, y, height } = clampLighting(lighting);
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
  return {
    dx: cos * boardX + sin * boardY,
    dy: cos * boardY - sin * boardX,
    blur: 0.5 + 0.25 * length,
    opacity: Math.min(0.45, Math.max(0.2, 0.45 - 0.025 * length)),
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
