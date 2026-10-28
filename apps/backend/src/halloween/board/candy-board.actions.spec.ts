import { applyCandyBoardActions } from "./candy-board.actions";
import {
  isNameplate,
  type CandyPlacement,
  type Sticker,
} from "./candy-board.schema";
import type { HalloweenCandyBoardAction } from "./candy-board.types";

const candy = (id: number) => ({ candy: id });
const NAMEPLATE = { nameplate: true as const };

const at = (
  sticker: Sticker,
  overrides: Partial<CandyPlacement> = {},
): CandyPlacement => ({
  sticker,
  x: 0.5,
  y: 0.5,
  rotation: 0,
  scale: 1,
  ...overrides,
});

/** Applies actions where the player may add the nameplate and any candy but 99. */
const apply = (
  placements: CandyPlacement[],
  actions: HalloweenCandyBoardAction[],
) =>
  applyCandyBoardActions(
    placements,
    actions,
    (sticker) => isNameplate(sticker) || sticker.candy !== 99,
  );

const order = (placements: CandyPlacement[]) =>
  placements.map((p) =>
    isNameplate(p.sticker) ? "nameplate" : p.sticker.candy,
  );

describe("applyCandyBoardActions", () => {
  const three = [at(candy(1)), at(candy(2)), at(candy(3))];

  it.each<[string, HalloweenCandyBoardAction, number[]]>([
    ["raises a candy to the top", { raise: candy(1) }, [2, 3, 1]],
    ["lowers a candy to the bottom", { lower: candy(3) }, [3, 1, 2]],
    ["moves a candy forward one", { forward: candy(1) }, [2, 1, 3]],
    ["moves a candy backward one", { backward: candy(3) }, [1, 3, 2]],
    ["leaves the top candy going forward", { forward: candy(3) }, [1, 2, 3]],
    [
      "leaves the bottom candy going backward",
      { backward: candy(1) },
      [1, 2, 3],
    ],
  ])("%s", (_what, action, expected) => {
    expect(order(apply(three, [action]))).toEqual(expected);
  });

  it("adds at no rotation and normal scale unless told otherwise", () => {
    expect(apply([], [{ add: { sticker: candy(1), x: 0.1, y: 0.2 } }])).toEqual(
      [at(candy(1), { x: 0.1, y: 0.2 })],
    );
  });

  it("edits only what it names", () => {
    expect(
      apply([at(candy(1))], [{ edit: { sticker: candy(1), scale: 2 } }]),
    ).toEqual([at(candy(1), { scale: 2 })]);
  });

  it("puts the nameplate in the pile, and moves it, as a candy", () => {
    const board = apply(
      [at(candy(1))],
      [
        { add: { sticker: NAMEPLATE, x: 0.5, y: 0.1 } },
        { lower: NAMEPLATE },
        { edit: { sticker: NAMEPLATE, rotation: 10 } },
      ],
    );
    expect(board).toEqual([
      at(NAMEPLATE, { y: 0.1, rotation: 10 }),
      at(candy(1)),
    ]);
    expect(order(apply(board, [{ remove: NAMEPLATE }]))).toEqual([1]);
  });

  // A change that cannot apply -- most often because another tab got there
  // first -- is skipped, and the rest of the batch still lands.
  describe("skipping what cannot apply", () => {
    it.each<[string, HalloweenCandyBoardAction]>([
      [
        "an add of a candy already on the board",
        { add: { sticker: candy(1), x: 0, y: 0 } },
      ],
      [
        "an add of a candy not the player's",
        { add: { sticker: candy(99), x: 0, y: 0 } },
      ],
      [
        "an add of a second nameplate",
        { add: { sticker: NAMEPLATE, x: 0, y: 0 } },
      ],
      [
        "an add of a nameplate that is false",
        { add: { sticker: { nameplate: false }, x: 0, y: 0 } },
      ],
      [
        "an edit of a candy not on the board",
        { edit: { sticker: candy(9), x: 0 } },
      ],
      ["an edit that changes nothing", { edit: { sticker: candy(1) } }],
      ["a raise of a candy not on the board", { raise: candy(9) }],
      ["a lower of a candy not on the board", { lower: candy(9) }],
      ["a forward of a candy not on the board", { forward: candy(9) }],
      ["a backward of a candy not on the board", { backward: candy(9) }],
      ["a remove of a candy not on the board", { remove: candy(9) }],
      ["an edit off the board", { edit: { sticker: candy(1), x: 1.01 } }],
      [
        "an edit at an impossible scale",
        { edit: { sticker: candy(1), scale: 5 } },
      ],
      [
        "an edit past a half turn",
        { edit: { sticker: candy(1), rotation: 181 } },
      ],
      ["an add off the board", { add: { sticker: candy(2), x: -0.1, y: 0 } }],
    ])("skips %s, and applies the rest", (_what, bad) => {
      const pile = [at(candy(1)), at(NAMEPLATE)];
      expect(
        apply(pile, [bad, { edit: { sticker: candy(1), x: 0.25 } }]),
      ).toEqual([at(candy(1), { x: 0.25 }), at(NAMEPLATE)]);
    });
  });
});
