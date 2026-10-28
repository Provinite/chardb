/**
 * Which candy a press on the board lands on: through transparent pixels, and
 * through a pile by pressing again.
 */
import { describe, it, expect } from "vitest";
import {
  alphaMask,
  candiesAt,
  nextSelection,
  type AlphaMask,
  type HitCandy,
} from "../candyHitTest";
import {
  CANDY_SIZE,
  NAMEPLATE,
  candySticker,
  stickerKey,
  type Placement,
} from "../candyBoard";

/** An RGBA image, as a canvas hands it back, from a per-pixel alpha function. */
const imageData = (
  width: number,
  height: number,
  alphaAt: (x: number, y: number) => number,
) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[(y * width + x) * 4 + 3] = alphaAt(x, y);
    }
  }
  return { width, height, data };
};

/** Opaque on its left half only. */
const leftHalf: AlphaMask = alphaMask(
  imageData(4, 4, (x) => (x < 2 ? 255 : 0)),
  4,
);

const at = (
  ref: number | "nameplate",
  overrides: Partial<Omit<Placement, "sticker">> = {},
): Placement => ({
  sticker: ref === "nameplate" ? NAMEPLATE : candySticker(ref),
  x: 0.5,
  y: 0.5,
  rotation: 0,
  scale: 1,
  ...overrides,
});

const candy = (
  placement: Placement,
  extra: Partial<Omit<HitCandy, "placement">> = {},
): HitCandy => ({ placement, aspect: 1, mask: null, ...extra });

// A 1000 x 750 board: a candy at scale 1 is 120px across.
const BOARD = { width: 1000, height: 750 };
const CENTRE = { x: 500, y: 375 };
const HALF = (CANDY_SIZE * BOARD.width) / 2; // 60px

describe("alphaMask", () => {
  it("keeps the alpha channel only", () => {
    const mask = alphaMask(
      imageData(2, 2, (x, y) => [10, 20, 30, 40][y * 2 + x]),
      2,
    );
    expect(mask).toEqual({
      width: 2,
      height: 2,
      alpha: Uint8Array.from([10, 20, 30, 40]),
    });
  });

  it("shrinks a big picture, keeping the most opaque pixel of each block", () => {
    // A one-pixel line, as thin as a lollipop stick, must not vanish.
    const mask = alphaMask(
      imageData(8, 8, (x) => (x === 5 ? 255 : 0)),
      4,
    );
    expect(mask.width).toBe(4);
    expect(mask.height).toBe(4);
    expect(Array.from(mask.alpha.slice(0, 4))).toEqual([0, 0, 255, 0]);
  });

  it("never grows a small picture", () => {
    expect(
      alphaMask(
        imageData(3, 2, () => 255),
        64,
      ),
    ).toMatchObject({
      width: 3,
      height: 2,
    });
  });
});

describe("candiesAt", () => {
  /** The stickers under a press on BOARD, by their keys, top first. */
  const hitAt = (point: { x: number; y: number }, pile: HitCandy[]) =>
    candiesAt(point, BOARD, pile);
  const key = (ref: number | "nameplate") =>
    stickerKey(ref === "nameplate" ? NAMEPLATE : candySticker(ref));

  it("finds a candy pressed inside its box when its picture is not read yet", () => {
    expect(hitAt(CENTRE, [candy(at(1))])).toEqual([key(1)]);
    expect(hitAt({ x: 500 + HALF + 1, y: 375 }, [candy(at(1))])).toEqual([]);
  });

  it("measures the nameplate by its own, wider size", () => {
    // Past a candy's box, but inside the nameplate's.
    const wide = { x: 500 + HALF * 2, y: 375 };
    expect(hitAt(wide, [candy(at(1))])).toEqual([]);
    expect(hitAt(wide, [candy(at("nameplate"), { aspect: 4 })])).toEqual([
      key("nameplate"),
    ]);
  });

  it("lists every candy under the press, top of the pile first", () => {
    expect(
      hitAt(CENTRE, [candy(at(1)), candy(at(2, { x: 0.1 })), candy(at(3))]),
    ).toEqual([key(3), key(1)]);
  });

  it("lets a press through a candy's transparent pixels", () => {
    const left = { x: 500 - HALF / 2, y: 375 };
    const right = { x: 500 + HALF / 2, y: 375 };
    const pile = [candy(at(1)), candy(at(2), { mask: leftHalf })];
    expect(hitAt(left, pile)).toEqual([key(2), key(1)]);
    expect(hitAt(right, pile)).toEqual([key(1)]);
  });

  it("counts a faint pixel as transparent", () => {
    const faint = alphaMask(
      imageData(1, 1, () => 20),
      1,
    );
    expect(hitAt(CENTRE, [candy(at(1), { mask: faint })])).toEqual([]);
  });

  it("follows a candy's rotation", () => {
    // Turned half way round, the opaque left half is on the right.
    const turned = [candy(at(1, { rotation: 180 }), { mask: leftHalf })];
    expect(hitAt({ x: 500 + HALF / 2, y: 375 }, turned)).toEqual([key(1)]);
    expect(hitAt({ x: 500 - HALF / 2, y: 375 }, turned)).toEqual([]);
  });

  it("follows a candy's scale", () => {
    const big = [candy(at(1, { scale: 2 }))];
    expect(hitAt({ x: 500 + HALF * 1.5, y: 375 }, big)).toEqual([key(1)]);
  });

  it("follows the shape of the picture, not a square", () => {
    // Twice as wide as tall: 120 x 60, so 40px below the centre is off it.
    const wide = [candy(at(1), { aspect: 2 })];
    expect(hitAt({ x: 500, y: 375 + 40 }, wide)).toEqual([]);
    expect(hitAt({ x: 500, y: 375 + 20 }, wide)).toEqual([key(1)]);
  });
});

describe("nextSelection", () => {
  it("picks the top candy under a fresh press", () => {
    expect(nextSelection(["c", "a"], null)).toBe("c");
    expect(nextSelection(["c", "a"], "z")).toBe("c");
  });

  it("goes one down from the selected candy, and wraps to the top", () => {
    expect(nextSelection(["c", "b", "a"], "c")).toBe("b");
    expect(nextSelection(["c", "b", "a"], "b")).toBe("a");
    expect(nextSelection(["c", "b", "a"], "a")).toBe("c");
  });

  it("is nothing when nothing is under the press", () => {
    expect(nextSelection([], "c")).toBeNull();
  });
});
