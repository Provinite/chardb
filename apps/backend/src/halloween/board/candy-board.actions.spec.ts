import { applyCandyBoardActions } from "./candy-board.actions";
import type { CandyPlacement } from "./candy-board.schema";
import type { HalloweenCandyBoardAction } from "./candy-board.types";

const at = (
  knockEventId: number,
  overrides: Partial<CandyPlacement> = {},
): CandyPlacement => ({
  knockEventId,
  x: 0.5,
  y: 0.5,
  rotation: 0,
  scale: 1,
  ...overrides,
});

/** Applies actions where the player may add any candy but 99. */
const apply = (
  placements: CandyPlacement[],
  actions: HalloweenCandyBoardAction[],
) => applyCandyBoardActions(placements, actions, (id) => id !== 99);

const ids = (placements: CandyPlacement[]) =>
  placements.map((p) => p.knockEventId);

describe("applyCandyBoardActions", () => {
  const three = [at(1), at(2), at(3)];

  it.each<[string, HalloweenCandyBoardAction, number[]]>([
    ["raises a candy to the top", { raise: { knockEventId: 1 } }, [2, 3, 1]],
    ["lowers a candy to the bottom", { lower: { knockEventId: 3 } }, [3, 1, 2]],
    ["moves a candy forward one", { forward: { knockEventId: 1 } }, [2, 1, 3]],
    [
      "moves a candy backward one",
      { backward: { knockEventId: 3 } },
      [1, 3, 2],
    ],
    [
      "leaves the top candy going forward",
      { forward: { knockEventId: 3 } },
      [1, 2, 3],
    ],
    [
      "leaves the bottom candy going backward",
      { backward: { knockEventId: 1 } },
      [1, 2, 3],
    ],
  ])("%s", (_what, action, order) => {
    expect(ids(apply(three, [action]))).toEqual(order);
  });

  it("adds at no rotation and normal scale unless told otherwise", () => {
    expect(apply([], [{ add: { knockEventId: 1, x: 0.1, y: 0.2 } }])).toEqual([
      at(1, { x: 0.1, y: 0.2 }),
    ]);
  });

  it("edits only what it names", () => {
    expect(apply([at(1)], [{ edit: { knockEventId: 1, scale: 2 } }])).toEqual([
      at(1, { scale: 2 }),
    ]);
  });

  // A change that cannot apply -- most often because another tab got there
  // first -- is skipped, and the rest of the batch still lands.
  describe("skipping what cannot apply", () => {
    it.each<[string, HalloweenCandyBoardAction]>([
      [
        "an add of a candy already on the board",
        { add: { knockEventId: 1, x: 0, y: 0 } },
      ],
      [
        "an add of a candy not the player's",
        { add: { knockEventId: 99, x: 0, y: 0 } },
      ],
      [
        "an edit of a candy not on the board",
        { edit: { knockEventId: 9, x: 0 } },
      ],
      ["an edit that changes nothing", { edit: { knockEventId: 1 } }],
      ["a raise of a candy not on the board", { raise: { knockEventId: 9 } }],
      ["a lower of a candy not on the board", { lower: { knockEventId: 9 } }],
      [
        "a forward of a candy not on the board",
        { forward: { knockEventId: 9 } },
      ],
      [
        "a backward of a candy not on the board",
        { backward: { knockEventId: 9 } },
      ],
      ["a remove of a candy not on the board", { remove: { knockEventId: 9 } }],
      ["an edit off the board", { edit: { knockEventId: 1, x: 1.01 } }],
      [
        "an edit at an impossible scale",
        { edit: { knockEventId: 1, scale: 5 } },
      ],
      [
        "an edit past a half turn",
        { edit: { knockEventId: 1, rotation: 181 } },
      ],
      ["an add off the board", { add: { knockEventId: 2, x: -0.1, y: 0 } }],
    ])("skips %s, and applies the rest", (_what, bad) => {
      expect(
        apply([at(1)], [bad, { edit: { knockEventId: 1, x: 0.25 } }]),
      ).toEqual([at(1, { x: 0.25 })]);
    });
  });
});
