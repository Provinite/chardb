import {
  candyPlacementSchema,
  sameSticker,
  type CandyPlacement,
  type Sticker,
} from "./candy-board.schema";
import type {
  HalloweenCandyBoardAction,
  HalloweenStickerInput,
} from "./candy-board.types";

/**
 * A sticker as an action names it, or null for one that names nothing: the
 * schema makes sure exactly one field is set, but not that `nameplate` is
 * true.
 */
export function stickerOf(input: HalloweenStickerInput): Sticker | null {
  if (input.candy != null) return { candy: input.candy };
  if (input.nameplate === true) return { nameplate: true };
  return null;
}

/**
 * Applies a batch of actions to a board's placements, in order, and returns
 * the result. Each is a `@oneOf` input, so the schema has already made sure
 * exactly one of its fields is set.
 *
 * An action that cannot apply is skipped and the rest still land: adding a
 * sticker already on the board or not the player's, changing one that is
 * not on it, an edit that changes nothing, or one that would leave a sticker
 * off the board or at an impossible size. The board the caller sends back is
 * the truth either way, so nothing needs to say which were skipped. Most
 * often it is a second tab that got there first, and failing the whole batch
 * for that would throw away everything else in it.
 *
 * Pure: `canAdd` says which stickers may go on, which takes the database to
 * know.
 */
export function applyCandyBoardActions(
  placements: CandyPlacement[],
  actions: HalloweenCandyBoardAction[],
  canAdd: (sticker: Sticker) => boolean,
): CandyPlacement[] {
  const next = [...placements];
  const indexOf = (sticker: Sticker) =>
    next.findIndex((p) => sameSticker(p.sticker, sticker));
  const valid = (p: CandyPlacement) =>
    candyPlacementSchema.safeParse(p).success;

  /** Moves the sticker at `from` to `to`, shifting the ones between. */
  const restack = (from: number, to: number) => {
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
  };

  for (const action of actions) {
    const { add, edit, raise, lower, forward, backward, remove } = action;
    if (add) {
      const sticker = stickerOf(add.sticker);
      if (!sticker) continue;
      const placement = {
        sticker,
        x: add.x,
        y: add.y,
        rotation: add.rotation ?? 0,
        scale: add.scale ?? 1,
      };
      if (indexOf(sticker) === -1 && canAdd(sticker) && valid(placement)) {
        next.push(placement);
      }
      continue;
    }

    const named =
      edit?.sticker ?? raise ?? lower ?? forward ?? backward ?? remove;
    const sticker = named ? stickerOf(named) : null;
    const index = sticker ? indexOf(sticker) : -1;
    if (index === -1) continue;

    if (edit) {
      const p = next[index];
      const edited = {
        ...p,
        x: edit.x ?? p.x,
        y: edit.y ?? p.y,
        rotation: edit.rotation ?? p.rotation,
        scale: edit.scale ?? p.scale,
      };
      const changesSomething =
        edit.x != null ||
        edit.y != null ||
        edit.rotation != null ||
        edit.scale != null;
      if (changesSomething && valid(edited)) next[index] = edited;
    } else if (raise) {
      restack(index, next.length - 1);
    } else if (lower) {
      restack(index, 0);
    } else if (forward) {
      // The top sticker has nothing above to pass, nor the bottom below.
      if (index < next.length - 1) restack(index, index + 1);
    } else if (backward) {
      if (index > 0) restack(index, index - 1);
    } else if (remove) {
      next.splice(index, 1);
    }
  }

  return next;
}

/** The candies a batch puts on the board, whose ownership needs checking. */
export const addedCandies = (actions: HalloweenCandyBoardAction[]): number[] =>
  actions.flatMap((a) =>
    a.add?.sticker.candy != null ? [a.add.sticker.candy] : [],
  );
