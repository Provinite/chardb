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
