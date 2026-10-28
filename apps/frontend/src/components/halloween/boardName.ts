/**
 * A candy board's name: a first word, an optional joiner and a last word,
 * each picked from its list in @chardb/shared, the same lists the backend
 * checks a name against.
 */
import {
  BOARD_NAME_FIRST_WORDS,
  BOARD_NAME_JOINERS,
  BOARD_NAME_LAST_WORDS,
} from "@chardb/shared";
import type { HalloweenCandyBoardName } from "../../generated/graphql";

export type BoardName = Omit<HalloweenCandyBoardName, "__typename">;

export interface BoardNameWords {
  first: readonly string[];
  joiners: readonly string[];
  last: readonly string[];
}

/** The words a board's name is picked from. */
export const BOARD_NAME_WORDS: BoardNameWords = {
  first: BOARD_NAME_FIRST_WORDS,
  joiners: BOARD_NAME_JOINERS,
  last: BOARD_NAME_LAST_WORDS,
};

/** "Moonlit von Pumpkin", or "Spooky Hoard" with no joiner. */
export const formatBoardName = ({ first, joiner, last }: BoardName) =>
  [first, joiner, last].filter(Boolean).join(" ");

const pick = (list: readonly string[], random: () => number) =>
  list[Math.min(list.length - 1, Math.floor(random() * list.length))];

/**
 * A name picked at random, with a joiner half the time, and never the same
 * as the one it replaces.
 */
export function shuffledName(
  words: BoardNameWords,
  random: () => number = Math.random,
  current: BoardName | null = null,
): BoardName {
  for (;;) {
    const first = pick(words.first, random);
    const joiner = random() < 0.5 ? pick(words.joiners, random) : null;
    const last = pick(words.last, random);
    const name = { first, joiner, last };
    if (!current || formatBoardName(name) !== formatBoardName(current)) {
      return name;
    }
  }
}
