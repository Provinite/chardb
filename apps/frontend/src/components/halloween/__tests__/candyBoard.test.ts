/**
 * The candy board's state: where candies sit, which are still in the tray,
 * and the changes waiting to be saved.
 */
import { describe, it, expect } from "vitest";
import { HalloweenCandyBoardActionType as T } from "../../../generated/graphql";
import {
  applyAction,
  clampPlacement,
  enqueue,
  pointOnBoard,
  trayGroups,
  type BoardAction,
  type Placement,
} from "../candyBoard";

const at = (knockEventId: number, overrides: Partial<Placement> = {}) => ({
  knockEventId,
  x: 0.5,
  y: 0.5,
  rotation: 0,
  scale: 1,
  ...overrides,
});

const add = (knockEventId: number, overrides: Partial<Placement> = {}) => ({
  type: T.Add,
  ...at(knockEventId, overrides),
});

describe("clampPlacement", () => {
  it("keeps a candy on the board and at a possible size", () => {
    expect(
      clampPlacement(at(1, { x: -0.2, y: 1.4, scale: 9, rotation: 0 })),
    ).toEqual(at(1, { x: 0, y: 1, scale: 4 }));
    expect(clampPlacement(at(1, { scale: 0.01 })).scale).toBe(0.25);
  });

  it("wraps rotation into -180 to 180", () => {
    expect(clampPlacement(at(1, { rotation: 190 })).rotation).toBe(-170);
    expect(clampPlacement(at(1, { rotation: -190 })).rotation).toBe(170);
    expect(clampPlacement(at(1, { rotation: 180 })).rotation).toBe(180);
    expect(clampPlacement(at(1, { rotation: 540 })).rotation).toBe(180);
  });
});

describe("pointOnBoard", () => {
  const rect = { left: 100, top: 50, width: 400, height: 300 };

  it("turns a pointer position into a fraction of the board", () => {
    expect(pointOnBoard(300, 125, rect)).toEqual({ x: 0.5, y: 0.25 });
  });

  it("keeps a point outside the board on its edge", () => {
    expect(pointOnBoard(0, 1000, rect)).toEqual({ x: 0, y: 1 });
  });
});

describe("trayGroups", () => {
  const candies = [
    { knockEventId: 1, slug: "candy-corn" },
    { knockEventId: 2, slug: "luther-head" },
    { knockEventId: 3, slug: "candy-corn" },
    { knockEventId: 4, slug: "banana" },
  ];

  it("groups the candies not on the board by slug, in the order first got", () => {
    expect(trayGroups(candies, [at(2)])).toEqual([
      { slug: "candy-corn", knockEventIds: [1, 3] },
      { slug: "banana", knockEventIds: [4] },
    ]);
  });

  it("is empty once everything is placed", () => {
    expect(trayGroups(candies, [at(1), at(2), at(3), at(4)])).toEqual([]);
  });
});

describe("applyAction", () => {
  it("adds a candy on top of the pile, within limits", () => {
    expect(applyAction([at(1)], add(2, { x: 1.5 }))).toEqual([
      at(1),
      at(2, { x: 1 }),
    ]);
  });

  it("does not add a candy twice", () => {
    expect(applyAction([at(1)], add(1, { x: 0 }))).toEqual([at(1)]);
  });

  it("edits only the fields given, within limits", () => {
    expect(
      applyAction([at(1), at(2)], {
        type: T.Edit,
        knockEventId: 1,
        rotation: 200,
        scale: 10,
      }),
    ).toEqual([at(1, { rotation: -160, scale: 4 }), at(2)]);
  });

  it("raises a candy to the top of the pile", () => {
    expect(
      applyAction([at(1), at(2), at(3)], { type: T.Raise, knockEventId: 1 }),
    ).toEqual([at(2), at(3), at(1)]);
  });

  it("puts a candy back in the tray", () => {
    expect(
      applyAction([at(1), at(2)], { type: T.Remove, knockEventId: 1 }),
    ).toEqual([at(2)]);
  });

  it("ignores a change to a candy not on the board", () => {
    const actions: BoardAction[] = [
      { type: T.Edit, knockEventId: 9, x: 0 },
      { type: T.Raise, knockEventId: 9 },
      { type: T.Remove, knockEventId: 9 },
    ];
    for (const action of actions) {
      expect(applyAction([at(1)], action)).toEqual([at(1)]);
    }
  });
});

describe("enqueue", () => {
  const edit = (
    knockEventId: number,
    changes: Partial<Omit<Placement, "knockEventId">>,
  ): BoardAction => ({ type: T.Edit, knockEventId, ...changes });

  it("folds an edit into the waiting add of the same candy", () => {
    expect(enqueue([add(1)], edit(1, { x: 0.1 }))).toEqual([
      add(1, { x: 0.1 }),
    ]);
  });

  it("folds an edit into the waiting edit of the same candy", () => {
    expect(
      enqueue([edit(1, { x: 0.1 }), edit(2, { y: 0 })], edit(1, { scale: 2 })),
    ).toEqual([edit(1, { x: 0.1, scale: 2 }), edit(2, { y: 0 })]);
  });

  it("keeps an edit after a raise of the same candy separate", () => {
    const raise: BoardAction = { type: T.Raise, knockEventId: 1 };
    expect(enqueue([raise], edit(1, { x: 0 }))).toEqual([
      raise,
      edit(1, { x: 0 }),
    ]);
  });

  it("drops an add and everything after it when the candy goes back unsaved", () => {
    expect(
      enqueue(
        [
          add(1),
          edit(2, { x: 0 }),
          edit(1, { y: 0 }),
          { type: T.Raise, knockEventId: 1 },
        ],
        { type: T.Remove, knockEventId: 1 },
      ),
    ).toEqual([edit(2, { x: 0 })]);
  });

  it("replaces waiting edits and raises with the remove of a saved candy", () => {
    expect(
      enqueue([edit(1, { x: 0 }), { type: T.Raise, knockEventId: 1 }], {
        type: T.Remove,
        knockEventId: 1,
      }),
    ).toEqual([{ type: T.Remove, knockEventId: 1 }]);
  });
});
