/**
 * The candy board's state, kept apart from the page so it can be tested
 * without a pointer. A board is a list of placements, bottom of the pile
 * first. Every change is an action, applied here at once so the page shows
 * it, and queued to be sent: the server applies the same actions to its own
 * copy, so a stale page can only touch the candies it changes.
 *
 * The limits mirror the backend's (candy-board.schema.ts), which refuses a
 * change outside them.
 */
import { HalloweenCandyBoardActionType as T } from "../../generated/graphql";

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

type Changes = Partial<Omit<Placement, "knockEventId">>;

/** One change to a board, as `applyHalloweenCandyBoardActions` takes it. */
export type BoardAction =
  | ({ type: T.Add } & Placement)
  | ({ type: T.Edit; knockEventId: number } & Changes)
  | { type: T.Raise | T.Remove; knockEventId: number };

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

/**
 * The board after one action. An action that cannot apply -- adding a candy
 * already placed, changing one that is not -- leaves it as it was; the server
 * is what refuses those.
 */
export function applyAction(
  placements: Placement[],
  action: BoardAction,
): Placement[] {
  const index = placements.findIndex(
    (p) => p.knockEventId === action.knockEventId,
  );
  switch (action.type) {
    case T.Add: {
      if (index !== -1) return placements;
      const { type: _type, ...placement } = action;
      return [...placements, clampPlacement(placement)];
    }
    case T.Edit: {
      if (index === -1) return placements;
      const { type: _type, knockEventId: _id, ...changes } = action;
      return placements.map((p, i) =>
        i === index ? clampPlacement({ ...p, ...changes }) : p,
      );
    }
    case T.Raise: {
      if (index === -1) return placements;
      return [...placements.filter((_, i) => i !== index), placements[index]];
    }
    case T.Remove:
      return placements.filter((_, i) => i !== index);
  }
}

/**
 * Adds an action to the changes waiting to be sent, folding it into what is
 * already waiting where it can: a candy dragged or resized many times before
 * a save goes as one change, and one put back before it was ever saved goes
 * as nothing.
 */
export function enqueue(
  queue: BoardAction[],
  action: BoardAction,
): BoardAction[] {
  const id = action.knockEventId;
  const lastIndex = queue.map((a) => a.knockEventId).lastIndexOf(id);
  const last = lastIndex === -1 ? null : queue[lastIndex];

  if (action.type === T.Edit) {
    if (last && (last.type === T.Add || last.type === T.Edit)) {
      const { type: _type, knockEventId: _id, ...changes } = action;
      return queue.map((a, i) =>
        i === lastIndex ? ({ ...a, ...changes } as BoardAction) : a,
      );
    }
    return [...queue, action];
  }

  if (action.type === T.Remove) {
    const addIndex = queue.findIndex(
      (a) => a.knockEventId === id && a.type === T.Add,
    );
    if (addIndex !== -1) {
      // Never saved: drop the add and every later change to it.
      return queue.filter((a, i) => i < addIndex || a.knockEventId !== id);
    }
    return [...queue.filter((a) => a.knockEventId !== id), action];
  }

  return [...queue, action];
}

export const candyImageUrl = (slug: string) => `/halloween/candy/${slug}.png`;

/** "luther-head" -> "luther head": what a candy is called on the page. */
export const candyName = (slug: string) => slug.replace(/-/g, " ");
