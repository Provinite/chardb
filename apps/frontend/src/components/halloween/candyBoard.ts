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
  HalloweenStickerInput,
} from "../../generated/graphql";

/**
 * What a placement is: a candy, by the knock that gave it, or the board's
 * nameplate. The API sends both fields, one of them null; an action names
 * exactly one.
 */
export interface StickerFields {
  candy?: number | null;
  nameplate?: boolean | null;
}

/** A sticker as an action names it: exactly one field. */
export type Sticker = HalloweenStickerInput;

export const NAMEPLATE: Sticker = { nameplate: true };

export const candySticker = (candyId: number): Sticker => ({
  candy: candyId,
});

/** What the page knows a sticker by: "candy:12", or "nameplate". */
export type StickerKey = string;

export const stickerKey = (sticker: StickerFields): StickerKey =>
  sticker.candy != null ? `candy:${sticker.candy}` : "nameplate";

export const NAMEPLATE_KEY = stickerKey(NAMEPLATE);

/** The sticker a key stands for, as an action names it. */
export const stickerFromKey = (key: StickerKey): Sticker =>
  key === NAMEPLATE_KEY
    ? NAMEPLATE
    : candySticker(Number(key.slice("candy:".length)));

/** A sticker as the API sent it, as an action names it. */
export const stickerRef = (sticker: StickerFields): Sticker =>
  sticker.candy != null ? candySticker(sticker.candy) : NAMEPLATE;

export interface Placement {
  sticker: StickerFields;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

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

export function clampPlacement<P extends Omit<Placement, "sticker">>(p: P): P {
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
  candyIds: number[];
}

/** The candies not on the board, one group per kind, by the kind's name. */
export function trayGroups(
  candies: { id: number; slug: string }[],
  placements: Placement[],
): TrayGroup[] {
  const placed = new Set(placements.map((p) => p.sticker.candy));
  const groups = new Map<string, number[]>();
  for (const candy of candies) {
    if (placed.has(candy.id)) continue;
    const ids = groups.get(candy.slug) ?? [];
    ids.push(candy.id);
    groups.set(candy.slug, ids);
  }
  // By name, so a group keeps its place as its candies come and go.
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, candyIds]) => ({ slug, candyIds }));
}

/** The sticker an action is about. */
export function stickerOf(action: BoardAction): Sticker {
  if (action.add) return action.add.sticker;
  if (action.edit) return action.edit.sticker;
  return (
    action.raise ??
    action.lower ??
    action.forward ??
    action.backward ??
    action.remove
  );
}

/** What the page knows the sticker an action is about by. */
export const keyOf = (action: BoardAction): StickerKey =>
  stickerKey(stickerOf(action));

type Changes = Partial<Omit<Placement, "sticker">>;

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
  const key = keyOf(action);
  const index = placements.findIndex((p) => stickerKey(p.sticker) === key);
  if (action.add) {
    if (index !== -1) return placements;
    const { sticker, x, y, rotation, scale } = action.add;
    return [
      ...placements,
      clampPlacement({
        sticker,
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
  if (action.lower) {
    return [placements[index], ...placements.filter((_, i) => i !== index)];
  }
  if (action.forward || action.backward) {
    // Swapped with the neighbour one place up or down; at the end of the
    // pile there is none, and it stays put.
    const other = index + (action.forward ? 1 : -1);
    if (other < 0 || other >= placements.length) return placements;
    const next = [...placements];
    [next[index], next[other]] = [next[other], next[index]];
    return next;
  }
  return placements.filter((_, i) => i !== index);
}

/**
 * An action with its values kept on the board and possible, measured against
 * the candy as it stands -- exactly what `applyAction` will show. Sent raw, a
 * drag past the edge would leave the page showing the candy at the edge and
 * the server, which skips such a change, keeping it where it was.
 */
export function clampAction(
  placements: Placement[],
  action: BoardAction,
): BoardAction {
  if (action.add) {
    const { sticker, x, y, rotation, scale } = action.add;
    return {
      add: clampPlacement({
        sticker,
        x,
        y,
        rotation: rotation ?? 0,
        scale: scale ?? 1,
      }),
    };
  }
  if (!action.edit) return action;
  const key = stickerKey(action.edit.sticker);
  const current = placements.find((p) => stickerKey(p.sticker) === key);
  if (!current) return action;
  const changes = changesOf(action.edit);
  const clamped = clampPlacement({ ...current, ...changes });
  const edit: NonNullable<BoardAction["edit"]> = {
    sticker: action.edit.sticker,
  };
  for (const key of Object.keys(changes) as (keyof Changes)[]) {
    edit[key] = clamped[key];
  }
  return { edit };
}

/** The most changes one save takes; the server refuses more. */
export const MAX_BATCH = 100;

/** The changes for the next save, and what waits for the one after. */
export function nextBatch(
  queue: BoardAction[],
): [batch: BoardAction[], rest: BoardAction[]] {
  return [queue.slice(0, MAX_BATCH), queue.slice(MAX_BATCH)];
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
  const key = keyOf(action);
  const lastIndex = queue.map(keyOf).lastIndexOf(key);
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
    const addIndex = queue.findIndex(
      (a) => a.add && stickerKey(a.add.sticker) === key,
    );
    if (addIndex !== -1) {
      // Never saved: drop the add and every later change to it.
      return queue.filter((a, i) => i < addIndex || keyOf(a) !== key);
    }
    return [...queue.filter((a) => keyOf(a) !== key), action];
  }

  return [...queue, action];
}

export const candyImageUrl = (slug: string) => `/halloween/candy/${slug}.png`;

/** "luther-head" -> "luther head": what a candy is called on the page. */
export const candyName = (slug: string) => slug.replace(/-/g, " ");
