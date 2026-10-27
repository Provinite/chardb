/**
 * The candy board's state, kept apart from the page so it can be tested
 * without a pointer. A board is a list of placements, bottom of the pile
 * first. Every change is an action, applied here at once so the page shows
 * it, and queued to be sent: the server applies the same actions to its own
 * copy, so a stale page can only touch the candies it changes.
 *
 * Both types are the schema's own, as codegen makes them. The limits mirror
 * the backend's (candy-board.schema.ts), which refuses a change outside them.
 */
import type {
  HalloweenCandyBoardAction,
  HalloweenCandyPlacement,
} from "../../generated/graphql";

export type Placement = Omit<HalloweenCandyPlacement, "__typename">;

/** One change to a board: exactly one of add, edit, raise or remove. */
export type BoardAction = HalloweenCandyBoardAction;

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

/** The candy an action is about. */
export function candyOf(action: BoardAction): number {
  if (action.add) return action.add.knockEventId;
  if (action.edit) return action.edit.knockEventId;
  if (action.raise) return action.raise.knockEventId;
  return action.remove.knockEventId;
}

type Changes = Partial<Omit<Placement, "knockEventId">>;

/** An edit's fields that are set; an unset field means "leave it". */
function changesOf(edit: NonNullable<BoardAction["edit"]>): Changes {
  const changes: Changes = {};
  if (edit.x != null) changes.x = edit.x;
  if (edit.y != null) changes.y = edit.y;
  if (edit.rotation != null) changes.rotation = edit.rotation;
  if (edit.scale != null) changes.scale = edit.scale;
  return changes;
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
  const id = candyOf(action);
  const index = placements.findIndex((p) => p.knockEventId === id);
  if (action.add) {
    if (index !== -1) return placements;
    const { knockEventId, x, y, rotation, scale } = action.add;
    return [
      ...placements,
      clampPlacement({
        knockEventId,
        x,
        y,
        rotation: rotation ?? 0,
        scale: scale ?? 1,
      }),
    ];
  }
  if (index === -1) return placements;
  if (action.edit) {
    const changes = changesOf(action.edit);
    return placements.map((p, i) =>
      i === index ? clampPlacement({ ...p, ...changes }) : p,
    );
  }
  if (action.raise) {
    return [...placements.filter((_, i) => i !== index), placements[index]];
  }
  return placements.filter((_, i) => i !== index);
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
  const id = candyOf(action);
  const lastIndex = queue.map(candyOf).lastIndexOf(id);
  const last = lastIndex === -1 ? null : queue[lastIndex];

  if (action.edit) {
    const changes = changesOf(action.edit);
    // The server refuses an edit that changes nothing.
    if (Object.keys(changes).length === 0) return queue;
    if (last?.add) {
      return queue.map((a, i) =>
        i === lastIndex && a.add ? { add: { ...a.add, ...changes } } : a,
      );
    }
    if (last?.edit) {
      return queue.map((a, i) =>
        i === lastIndex && a.edit ? { edit: { ...a.edit, ...changes } } : a,
      );
    }
    return [...queue, action];
  }

  if (action.remove) {
    const addIndex = queue.findIndex((a) => a.add?.knockEventId === id);
    if (addIndex !== -1) {
      // Never saved: drop the add and every later change to it.
      return queue.filter((a, i) => i < addIndex || candyOf(a) !== id);
    }
    return [...queue.filter((a) => candyOf(a) !== id), action];
  }

  return [...queue, action];
}

export const candyImageUrl = (slug: string) => `/halloween/candy/${slug}.png`;

/** "luther-head" -> "luther head": what a candy is called on the page. */
export const candyName = (slug: string) => slug.replace(/-/g, " ");
