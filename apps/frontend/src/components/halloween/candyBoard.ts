/**
 * The candy board's state, kept apart from the page so it can be tested
 * without a pointer. A board is a list of placements, bottom of the pile
 * first; every edit returns a new list, which is what gets saved.
 *
 * The limits mirror the backend's (candy-board.schema.ts), which refuses a
 * save outside them.
 */

export interface Placement {
  knockEventId: number;
  /** The candy's centre, as a fraction of the board's width, 0-1. */
  x: number;
  /** The candy's centre, as a fraction of the board's height, 0-1. */
  y: number;
  /** Degrees clockwise, -180 to 180. */
  rotation: number;
  scale: number;
}

export interface Point {
  x: number;
  y: number;
}

export const SCALE_MIN = 0.25;
export const SCALE_MAX = 4;

/** Width over height. Placements are fractions, so this is fixed for good. */
export const BOARD_ASPECT = 4 / 3;

/** A candy at scale 1 is this fraction of the board's width across. */
export const CANDY_SIZE = 0.12;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Into (-180, 180], so a full turn either way lands where it started. */
const wrapRotation = (degrees: number) => {
  const wrapped = (((degrees + 180) % 360) + 360) % 360;
  return wrapped === 0 ? 180 : wrapped - 180;
};

export function clampPlacement(p: Placement): Placement {
  return {
    ...p,
    x: clamp(p.x, 0, 1),
    y: clamp(p.y, 0, 1),
    rotation: wrapRotation(p.rotation),
    scale: clamp(p.scale, SCALE_MIN, SCALE_MAX),
  };
}

/** Where a pointer at (clientX, clientY) is on a board drawn in `rect`. */
export function pointOnBoard(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
): Point {
  return {
    x: clamp((clientX - rect.left) / rect.width, 0, 1),
    y: clamp((clientY - rect.top) / rect.height, 0, 1),
  };
}

export interface TrayGroup {
  slug: string;
  /** Every candy of this kind not on the board, first got first. */
  knockEventIds: number[];
}

/** The candies not on the board, one group per kind, in the order first got. */
export function trayGroups(
  candies: { knockEventId: number; slug: string }[],
  placements: Placement[],
): TrayGroup[] {
  const placed = new Set(placements.map((p) => p.knockEventId));
  const groups = new Map<string, number[]>();
  for (const candy of candies) {
    if (placed.has(candy.knockEventId)) continue;
    const ids = groups.get(candy.slug) ?? [];
    ids.push(candy.knockEventId);
    groups.set(candy.slug, ids);
  }
  return [...groups].map(([slug, knockEventIds]) => ({ slug, knockEventIds }));
}

export function placeFromTray(
  placements: Placement[],
  knockEventId: number,
  point: Point,
): Placement[] {
  return [
    ...placements,
    clampPlacement({ knockEventId, ...point, rotation: 0, scale: 1 }),
  ];
}

export function updatePlacement(
  placements: Placement[],
  knockEventId: number,
  changes: Partial<Omit<Placement, "knockEventId">>,
): Placement[] {
  return placements.map((p) =>
    p.knockEventId === knockEventId ? clampPlacement({ ...p, ...changes }) : p,
  );
}

export function moveTo(
  placements: Placement[],
  knockEventId: number,
  point: Point,
): Placement[] {
  return updatePlacement(placements, knockEventId, point);
}

export function bringToFront(
  placements: Placement[],
  knockEventId: number,
): Placement[] {
  const candy = placements.find((p) => p.knockEventId === knockEventId);
  if (!candy) return placements;
  return [...placements.filter((p) => p !== candy), candy];
}

export function removeFromBoard(
  placements: Placement[],
  knockEventId: number,
): Placement[] {
  return placements.filter((p) => p.knockEventId !== knockEventId);
}

export const candyImageUrl = (slug: string) => `/halloween/candy/${slug}.png`;

/** "luther-head" -> "luther head": what a candy is called on the page. */
export const candyName = (slug: string) => slug.replace(/-/g, " ");
