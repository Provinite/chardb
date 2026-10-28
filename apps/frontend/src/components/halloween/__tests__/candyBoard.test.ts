/**
 * The candy board's state: where candies sit, which are still in the tray,
 * and the changes waiting to be saved.
 */
import { describe, it, expect } from "vitest";
import {
  applyAction,
  clampAction,
  clampPlacement,
  nextBatch,
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

const add = (
  knockEventId: number,
  overrides: Partial<Placement> = {},
): BoardAction => ({ add: at(knockEventId, overrides) });

const edit = (
  knockEventId: number,
  changes: Partial<Omit<Placement, "knockEventId">>,
): BoardAction => ({ edit: { knockEventId, ...changes } });

const raise = (knockEventId: number): BoardAction => ({
  raise: { knockEventId },
});

const remove = (knockEventId: number): BoardAction => ({
  remove: { knockEventId },
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

  it("groups the candies not on the board by slug, in order of their names", () => {
    expect(trayGroups(candies, [at(2)])).toEqual([
      { slug: "banana", knockEventIds: [4] },
      { slug: "candy-corn", knockEventIds: [1, 3] },
    ]);
  });

  it("keeps each group in its place as its candies are used", () => {
    const order = (placed: number[]) =>
      trayGroups(candies, placed.map((id) => at(id))).map((g) => g.slug);
    expect(order([])).toEqual(["banana", "candy-corn", "luther-head"]);
    expect(order([1])).toEqual(["banana", "candy-corn", "luther-head"]);
    expect(order([1, 4])).toEqual(["candy-corn", "luther-head"]);
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

  it("adds at no turn and normal size unless told otherwise", () => {
    expect(
      applyAction([], { add: { knockEventId: 1, x: 0.1, y: 0.2 } }),
    ).toEqual([at(1, { x: 0.1, y: 0.2 })]);
  });

  it("does not add a candy twice", () => {
    expect(applyAction([at(1)], add(1, { x: 0 }))).toEqual([at(1)]);
  });

  it("edits only the fields given, within limits", () => {
    expect(
      applyAction([at(1), at(2)], edit(1, { rotation: 200, scale: 10 })),
    ).toEqual([at(1, { rotation: -160, scale: 4 }), at(2)]);
  });

  it("raises a candy to the top of the pile", () => {
    expect(applyAction([at(1), at(2), at(3)], raise(1))).toEqual([
      at(2),
      at(3),
      at(1),
    ]);
  });

  it("lowers a candy to the bottom of the pile", () => {
    expect(
      applyAction([at(1), at(2), at(3)], { lower: { knockEventId: 3 } }),
    ).toEqual([at(3), at(1), at(2)]);
  });

  it("moves a candy forward or backward one place", () => {
    const pile = [at(1), at(2), at(3)];
    expect(applyAction(pile, { forward: { knockEventId: 1 } })).toEqual([
      at(2),
      at(1),
      at(3),
    ]);
    expect(applyAction(pile, { backward: { knockEventId: 3 } })).toEqual([
      at(1),
      at(3),
      at(2),
    ]);
  });

  it("leaves the top candy where it is going forward, and the bottom one going backward", () => {
    const pile = [at(1), at(2)];
    expect(applyAction(pile, { forward: { knockEventId: 2 } })).toEqual(pile);
    expect(applyAction(pile, { backward: { knockEventId: 1 } })).toEqual(pile);
  });

  it("puts a candy back in the tray", () => {
    expect(applyAction([at(1), at(2)], remove(1))).toEqual([at(2)]);
  });

  it("ignores a change to a candy not on the board", () => {
    for (const action of [
      edit(9, { x: 0 }),
      raise(9),
      { lower: { knockEventId: 9 } },
      remove(9),
    ]) {
      expect(applyAction([at(1)], action)).toEqual([at(1)]);
    }
  });
});

describe("clampAction", () => {
  it("keeps an edit's values on the board and possible, as the board shows them", () => {
    expect(
      clampAction([at(1, { x: 0.02 })], {
        edit: { knockEventId: 1, x: -0.05, rotation: 200, scale: 9 },
      }),
    ).toEqual({ edit: { knockEventId: 1, x: 0, rotation: -160, scale: 4 } });
  });

  it("leaves out what an edit does not change", () => {
    expect(clampAction([at(1)], { edit: { knockEventId: 1, y: 2 } })).toEqual({
      edit: { knockEventId: 1, y: 1 },
    });
  });

  it("keeps an add on the board", () => {
    expect(
      clampAction([], {
        add: { knockEventId: 1, x: 1.5, y: 0.5, rotation: 0, scale: 1 },
      }),
    ).toEqual(add(1, { x: 1 }));
  });

  it("passes anything else through", () => {
    expect(clampAction([at(1)], raise(1))).toEqual(raise(1));
    expect(clampAction([], edit(9, { x: 2 }))).toEqual(edit(9, { x: 2 }));
  });
});

describe("nextBatch", () => {
  it("takes at most the most a save takes, in order", () => {
    const queue = Array.from({ length: 101 }, (_, i) => raise(i));
    const [batch, rest] = nextBatch(queue);
    expect(batch).toEqual(queue.slice(0, 100));
    expect(rest).toEqual([raise(100)]);
  });
});

describe("enqueue", () => {
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
    expect(enqueue([raise(1)], edit(1, { x: 0 }))).toEqual([
      raise(1),
      edit(1, { x: 0 }),
    ]);
  });

  it("never queues an edit that changes nothing", () => {
    expect(enqueue([], edit(1, {}))).toEqual([]);
  });

  it("drops an add and everything after it when the candy goes back unsaved", () => {
    expect(
      enqueue(
        [add(1), edit(2, { x: 0 }), edit(1, { y: 0 }), raise(1)],
        remove(1),
      ),
    ).toEqual([edit(2, { x: 0 })]);
  });

  it("replaces waiting edits and raises with the remove of a saved candy", () => {
    expect(enqueue([edit(1, { x: 0 }), raise(1)], remove(1))).toEqual([
      remove(1),
    ]);
  });
});
