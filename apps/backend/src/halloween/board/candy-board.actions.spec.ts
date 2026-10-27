import { applyCandyBoardActions } from "./candy-board.actions";
import type { CandyPlacement } from "./candy-board.schema";

const at = (knockEventId: number): CandyPlacement => ({
  knockEventId,
  x: 0.5,
  y: 0.5,
  rotation: 0,
  scale: 1,
});

const ids = (placements: CandyPlacement[]) =>
  placements.map((p) => p.knockEventId);

describe("applyCandyBoardActions", () => {
  it("raises a candy to the top of the pile", () => {
    expect(
      ids(
        applyCandyBoardActions(
          [at(1), at(2), at(3)],
          [{ raise: { knockEventId: 1 } }],
        ),
      ),
    ).toEqual([2, 3, 1]);
  });

  it("lowers a candy to the bottom of the pile", () => {
    expect(
      ids(
        applyCandyBoardActions(
          [at(1), at(2), at(3)],
          [{ lower: { knockEventId: 3 } }],
        ),
      ),
    ).toEqual([3, 1, 2]);
  });

  it("moves a candy forward one place", () => {
    expect(
      ids(
        applyCandyBoardActions(
          [at(1), at(2), at(3)],
          [{ forward: { knockEventId: 1 } }],
        ),
      ),
    ).toEqual([2, 1, 3]);
  });

  it("moves a candy backward one place", () => {
    expect(
      ids(
        applyCandyBoardActions(
          [at(1), at(2), at(3)],
          [{ backward: { knockEventId: 3 } }],
        ),
      ),
    ).toEqual([1, 3, 2]);
  });

  it("leaves the pile as it is moving the top candy forward or the bottom one backward", () => {
    const pile = [at(1), at(2)];
    expect(
      ids(applyCandyBoardActions(pile, [{ forward: { knockEventId: 2 } }])),
    ).toEqual([1, 2]);
    expect(
      ids(applyCandyBoardActions(pile, [{ backward: { knockEventId: 1 } }])),
    ).toEqual([1, 2]);
  });

  it("refuses to lower a candy not on the board", () => {
    expect(() =>
      applyCandyBoardActions([at(1)], [{ lower: { knockEventId: 9 } }]),
    ).toThrow("That candy is not on the board");
  });
});
