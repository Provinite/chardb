import { z } from "zod";

/**
 * How a candy may sit on a board. Shared with the frontend's editor through
 * the GraphQL descriptions; the service is what enforces them.
 */
export const CANDY_SCALE_MIN = 0.25;
export const CANDY_SCALE_MAX = 4;

/**
 * One candy on a board. `x` and `y` are the candy's centre as a fraction of
 * the board's width and height, so a board looks the same at any size.
 * `rotation` is in degrees, clockwise.
 */
export const candyPlacementSchema = z.object({
  knockEventId: z.number().int(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  rotation: z.number().min(-180).max(180),
  scale: z.number().min(CANDY_SCALE_MIN).max(CANDY_SCALE_MAX),
});

/**
 * What `HalloweenCandyBoard.placements` stores, bottom of the pile first: a
 * candy later in the list is drawn over one earlier.
 */
export const candyPlacementsSchema = z.array(candyPlacementSchema);

export type CandyPlacement = z.infer<typeof candyPlacementSchema>;

export const LIGHT_HEIGHT_MIN = 0.1;
export const LIGHT_HEIGHT_MAX = 1;

/**
 * Where the light over a board is. `x` and `y` place it over the board, as a
 * point in a unit circle centred on it (y down, as on screen); `height` is
 * how high it hangs. Shadows fall away from it, longer the further to the
 * side and the lower it is. `intensity`, 0 to 1, makes them darker and
 * sharper without changing their length.
 */
export const candyLightingSchema = z
  .object({
    x: z.number().min(-1).max(1),
    y: z.number().min(-1).max(1),
    height: z.number().min(LIGHT_HEIGHT_MIN).max(LIGHT_HEIGHT_MAX),
    intensity: z.number().min(0).max(1),
  })
  // A hair of slack for a point a pointer put on the rim.
  .refine(({ x, y }) => Math.hypot(x, y) <= 1 + 1e-9);

export type CandyLighting = z.infer<typeof candyLightingSchema>;
