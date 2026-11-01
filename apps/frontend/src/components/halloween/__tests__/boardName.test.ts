/**
 * A candy board's name: a first word, any joiner and a last word.
 */
import { describe, it, expect } from "vitest";
import {
  BOARD_NAME_WORDS,
  formatBoardName,
  shuffledName,
} from "../boardName";

const words = {
  first: ["Spooky", "Moonlit", "Golden"],
  joiners: ["of", "von"],
  last: ["Pumpkin", "Hoard"],
};

/** Plays back the given rolls, as Math.random would. */
const rolls = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("formatBoardName", () => {
  it("puts its words in order, with spaces", () => {
    expect(
      formatBoardName({ first: "Moonlit", joiner: "von", last: "Pumpkin" }),
    ).toBe("Moonlit von Pumpkin");
  });

  it("leaves out a missing joiner", () => {
    expect(
      formatBoardName({ first: "Spooky", joiner: null, last: "Hoard" }),
    ).toBe("Spooky Hoard");
  });
});

describe("shuffledName", () => {
  it("picks a first and a last word, and a joiner as often as not", () => {
    // First word, whether to join, joiner, last word.
    expect(shuffledName(words, rolls(0.5, 0.2, 0.9, 0.1))).toEqual({
      first: "Moonlit",
      joiner: "von",
      last: "Pumpkin",
    });
    expect(shuffledName(words, rolls(0.9, 0.7, 0.9))).toEqual({
      first: "Golden",
      joiner: null,
      last: "Hoard",
    });
  });

  it("never picks the same name twice running", () => {
    const current = { first: "Spooky", joiner: null, last: "Pumpkin" };
    // The first roll would give the current name; it rolls again.
    expect(
      shuffledName(words, rolls(0, 0.9, 0, 0.5, 0.9, 0.9), current),
    ).not.toEqual(current);
  });
});

describe("BOARD_NAME_WORDS", () => {
  const alphabetical = (list: readonly string[]) =>
    [...list].sort((a, b) => a.localeCompare(b));

  it.each(["first", "joiners", "last"] as const)(
    "offers the %s words in alphabetical order",
    (which) => {
      const list = BOARD_NAME_WORDS[which];
      expect(list.length).toBeGreaterThan(1);
      expect(list).toEqual(alphabetical(list));
    },
  );
});
