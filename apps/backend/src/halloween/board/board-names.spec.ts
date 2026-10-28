import {
  BOARD_NAME_FIRST_WORDS,
  BOARD_NAME_JOINERS,
  BOARD_NAME_LAST_WORDS,
  boardNameSchema,
} from "./board-names";

describe("board name words", () => {
  it.each([
    ["first", BOARD_NAME_FIRST_WORDS],
    ["last", BOARD_NAME_LAST_WORDS],
  ])("offers fifty-one %s words, each once, in title case", (_which, words) => {
    expect(words).toHaveLength(51);
    expect(new Set(words).size).toBe(words.length);
    for (const word of words) {
      expect(word).toMatch(/^[A-Z][a-z]+$/);
    }
  });

  it("offers lowercase joiners, each once", () => {
    expect(new Set(BOARD_NAME_JOINERS).size).toBe(BOARD_NAME_JOINERS.length);
    for (const joiner of BOARD_NAME_JOINERS) {
      expect(joiner).toBe(joiner.toLowerCase());
    }
  });
});

describe("boardNameSchema", () => {
  it("takes a first and a last word from their lists, with or without a joiner", () => {
    expect(
      boardNameSchema.safeParse({
        first: "Moonlit",
        joiner: "von",
        last: "Pumpkin",
      }).success,
    ).toBe(true);
    expect(
      boardNameSchema.safeParse({
        first: "Moonlit",
        joiner: null,
        last: "Hoard",
      }).success,
    ).toBe(true);
  });

  it("refuses a word from the wrong list, or none", () => {
    expect(
      boardNameSchema.safeParse({
        first: "Hoard",
        joiner: null,
        last: "Moonlit",
      }).success,
    ).toBe(false);
    expect(
      boardNameSchema.safeParse({
        first: "Moonlit",
        joiner: "with",
        last: "Hoard",
      }).success,
    ).toBe(false);
  });
});
