import { BadRequestException } from "@nestjs/common";
import {
  candyPlacementsSchema,
  type CandyPlacement,
} from "./candy-board.schema";
import {
  HalloweenCandyBoardActionType,
  type HalloweenCandyBoardActionInput,
} from "./candy-board.types";

/**
 * Applies a batch of actions to a board's placements, in order, and returns
 * the result. Pure: whether an added candy is the player's is the caller's
 * to check, since that needs the database.
 *
 * Actions name only the candies they change, so two tabs editing different
 * candies cannot undo each other, as replacing the whole list would.
 */
export function applyCandyBoardActions(
  placements: CandyPlacement[],
  actions: HalloweenCandyBoardActionInput[],
): CandyPlacement[] {
  let next = [...placements];
  const indexOf = (knockEventId: number) => {
    const index = next.findIndex((p) => p.knockEventId === knockEventId);
    if (index === -1) {
      throw new BadRequestException("That candy is not on the board");
    }
    return index;
  };

  for (const action of actions) {
    const { knockEventId } = action;
    switch (action.type) {
      case HalloweenCandyBoardActionType.ADD: {
        if (next.some((p) => p.knockEventId === knockEventId)) {
          throw new BadRequestException("That candy is already on the board");
        }
        if (action.x == null || action.y == null) {
          throw new BadRequestException("A candy needs a place on the board");
        }
        next.push({
          knockEventId,
          x: action.x,
          y: action.y,
          rotation: action.rotation ?? 0,
          scale: action.scale ?? 1,
        });
        break;
      }
      case HalloweenCandyBoardActionType.EDIT: {
        const index = indexOf(knockEventId);
        const p = next[index];
        next[index] = {
          ...p,
          x: action.x ?? p.x,
          y: action.y ?? p.y,
          rotation: action.rotation ?? p.rotation,
          scale: action.scale ?? p.scale,
        };
        break;
      }
      case HalloweenCandyBoardActionType.RAISE: {
        const [raised] = next.splice(indexOf(knockEventId), 1);
        next.push(raised);
        break;
      }
      case HalloweenCandyBoardActionType.REMOVE: {
        const index = indexOf(knockEventId);
        next = next.filter((_, i) => i !== index);
        break;
      }
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
