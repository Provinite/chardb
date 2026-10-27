import { BadRequestException } from "@nestjs/common";
import {
  candyPlacementsSchema,
  type CandyPlacement,
} from "./candy-board.schema";
import type { HalloweenCandyBoardAction } from "./candy-board.types";

/**
 * Applies a batch of actions to a board's placements, in order, and returns
 * the result. Pure: whether an added candy is the player's is the caller's
 * to check, since that needs the database.
 *
 * Actions name only the candies they change, so two tabs editing different
 * candies cannot undo each other, as replacing the whole list would. Each is
 * a `@oneOf` input, so the schema has already made sure exactly one of its
 * fields is set.
 */
export function applyCandyBoardActions(
  placements: CandyPlacement[],
  actions: HalloweenCandyBoardAction[],
): CandyPlacement[] {
  let next = [...placements];
  const indexOf = (knockEventId: number) => {
    const index = next.findIndex((p) => p.knockEventId === knockEventId);
    if (index === -1) {
      throw new BadRequestException("That candy is not on the board");
    }
    return index;
  };

  /** Swaps a candy with its neighbour `step` places up the pile, if any. */
  const shift = (knockEventId: number, step: 1 | -1) => {
    const index = indexOf(knockEventId);
    const other = index + step;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other], next[index]];
  };

  for (const {
    add,
    edit,
    raise,
    lower,
    forward,
    backward,
    remove,
  } of actions) {
    if (add) {
      if (next.some((p) => p.knockEventId === add.knockEventId)) {
        throw new BadRequestException("That candy is already on the board");
      }
      next.push({
        knockEventId: add.knockEventId,
        x: add.x,
        y: add.y,
        rotation: add.rotation ?? 0,
        scale: add.scale ?? 1,
      });
    } else if (edit) {
      const { knockEventId, ...changes } = edit;
      const index = indexOf(knockEventId);
      if (Object.values(changes).every((v) => v == null)) {
        throw new BadRequestException("An edit needs something to change");
      }
      const p = next[index];
      next[index] = {
        ...p,
        x: changes.x ?? p.x,
        y: changes.y ?? p.y,
        rotation: changes.rotation ?? p.rotation,
        scale: changes.scale ?? p.scale,
      };
    } else if (raise) {
      const [raised] = next.splice(indexOf(raise.knockEventId), 1);
      next.push(raised);
    } else if (lower) {
      const [lowered] = next.splice(indexOf(lower.knockEventId), 1);
      next.unshift(lowered);
    } else if (forward) {
      shift(forward.knockEventId, 1);
    } else if (backward) {
      shift(backward.knockEventId, -1);
    } else if (remove) {
      const index = indexOf(remove.knockEventId);
      next = next.filter((_, i) => i !== index);
    }
  }

  const parsed = candyPlacementsSchema.safeParse(next);
  if (!parsed.success) {
    throw new BadRequestException(
      "A candy is placed off the board or at an impossible size",
    );
  }
  return parsed.data;
}

/** The knocks a batch puts on the board, which must all be the player's. */
export const addedCandies = (actions: HalloweenCandyBoardAction[]): number[] =>
  actions.flatMap((a) => (a.add ? [a.add.knockEventId] : []));
