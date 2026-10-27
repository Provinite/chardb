/**
 * The candy board's state: where candies sit, and which are still in the tray.
 */
import { describe, it, expect } from "vitest";
import {
  bringToFront,
  clampPlacement,
  moveTo,
  placeFromTray,
  pointOnBoard,
  removeFromBoard,
  trayGroups,
  updatePlacement,
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

describe("editing", () => {
  it("places a candy from the tray on top of the pile", () => {
    expect(placeFromTray([at(1)], 2, { x: 0.1, y: 0.9 })).toEqual([
      at(1),
      at(2, { x: 0.1, y: 0.9 }),
    ]);
  });

  it("moves a candy without changing the stacking", () => {
    expect(moveTo([at(1), at(2)], 1, { x: 0, y: 0 })).toEqual([
      at(1, { x: 0, y: 0 }),
      at(2),
    ]);
  });

  it("brings a candy to the top of the pile", () => {
    expect(bringToFront([at(1), at(2), at(3)], 1)).toEqual([
      at(2),
      at(3),
      at(1),
    ]);
  });

  it("changes a candy's rotation or size within limits", () => {
    expect(updatePlacement([at(1)], 1, { rotation: 200, scale: 10 })).toEqual([
      at(1, { rotation: -160, scale: 4 }),
    ]);
  });

  it("puts a candy back in the tray", () => {
    expect(removeFromBoard([at(1), at(2)], 1)).toEqual([at(2)]);
  });
});
