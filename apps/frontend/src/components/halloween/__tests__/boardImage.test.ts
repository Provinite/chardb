/**
 * A candy board drawn as a picture to keep: what it is called, and that it
 * is drawn as the board shows it -- layer by layer, in the same order.
 */
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  BOARD_IMAGE_HEIGHT,
  BOARD_IMAGE_WIDTH,
  boardImageFileName,
  downloadBoardImage,
  drawBoard,
  type BoardImageOptions,
  type BoardScene,
  type LoadImage,
} from "../boardImage";
import { DEFAULT_LIGHTING, shadowOf } from "../candyLighting";
import { NAMEPLATE } from "../candyBoard";

// The nameplate's ribbon is fetched: here it is to hand.
vi.mock("../ribbon", () => ({
  loadRibbon: async () => "data:image/png;base64,cmliYm9u",
}));

describe("boardImageFileName", () => {
  it("is the board's name, made a file name", () => {
    expect(
      boardImageFileName({ first: "Clover", joiner: "upon", last: "Coin" }),
    ).toBe("clover-upon-coin.png");
    expect(
      boardImageFileName({ first: "Spooky", joiner: "'n'", last: "Hoard" }),
    ).toBe("spooky-n-hoard.png");
    expect(
      boardImageFileName({ first: "Golden", joiner: "à la", last: "Cider" }),
    ).toBe("golden-a-la-cider.png");
  });

  it("is candy-board.png for a board with no name", () => {
    expect(boardImageFileName(null)).toBe("candy-board.png");
  });
});

/** What was drawn, in order, with the state each draw was made in. */
type Op =
  | {
      op: "fillRect";
      fill: unknown;
      alpha: number;
      blend: string;
      rect: number[];
    }
  | {
      op: "drawImage";
      src: string;
      shadow: { colour: string; x: number; y: number; blur: number };
      blend: string;
    };

/** A canvas context that remembers what was drawn on it. */
function recorder(name = "board") {
  const ops: Op[] = [];
  const state = {
    fillStyle: "" as unknown,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    shadowColor: "rgba(0, 0, 0, 0)",
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
  };
  const saved: (typeof state)[] = [];
  const ctx = {
    ...state,
    canvas: { src: `canvas:${name}` },
    save() {
      saved.push({ ...this });
    },
    restore() {
      Object.assign(this, saved.pop());
    },
    translate() {},
    rotate() {},
    scale() {},
    fillRect(...rect: number[]) {
      ops.push({
        op: "fillRect",
        fill: this.fillStyle,
        alpha: this.globalAlpha,
        blend: this.globalCompositeOperation,
        rect,
      });
    },
    drawImage(image: { src: string }) {
      ops.push({
        op: "drawImage",
        src: image.src,
        shadow: {
          colour: this.shadowColor,
          x: this.shadowOffsetX,
          y: this.shadowOffsetY,
          blur: this.shadowBlur,
        },
        blend: this.globalCompositeOperation,
      });
    },
    createRadialGradient() {
      const stops: [number, string][] = [];
      return {
        stops,
        addColorStop(at: number, colour: string) {
          stops.push([at, colour]);
        },
      };
    },
  };
  return { ctx, ops };
}

/** Loads every picture as a 100 x 100 one, but any named as broken. */
const loader =
  (broken: string[] = []): LoadImage =>
  async (src) => {
    if (broken.includes(src)) throw new Error("did not load");
    return { src, naturalWidth: 100, naturalHeight: 100 } as HTMLImageElement;
  };

const W = BOARD_IMAGE_WIDTH;

const scene = (changes: Partial<BoardScene> = {}): BoardScene => ({
  candies: [
    { id: 1, slug: "candy-corn" },
    { id: 2, slug: "luther-head" },
  ],
  placements: [
    { sticker: { candy: 1 }, x: 0.25, y: 0.5, rotation: 0, scale: 1 },
    { sticker: { candy: 2 }, x: 0.75, y: 0.5, rotation: 90, scale: 2 },
  ],
  background: "daphne-luther-hug",
  backgroundEffects: null,
  lighting: null,
  name: null,
  ...changes,
});

const draw = async (
  s: BoardScene,
  broken: string[] = [],
  options?: BoardImageOptions,
) => {
  const { ctx, ops } = recorder();
  const layers: Op[][] = [];
  await drawBoard(
    ctx as unknown as CanvasRenderingContext2D,
    s,
    loader(broken),
    options,
    () => {
      const layer = recorder("mask");
      layers.push(layer.ops);
      return layer.ctx as unknown as CanvasRenderingContext2D;
    },
  );
  return Object.assign(ops, { layers });
};

const images = (ops: Op[]) =>
  ops.flatMap((o) => (o.op === "drawImage" ? [o] : []));

/** Where the last candy was drawn. */
const lastCandyAt = (ops: Op[]) => {
  for (let i = ops.length - 1; i >= 0; i--) {
    const o = ops[i];
    if (o.op === "drawImage" && o.src.includes("/candy/")) return i;
  }
  return -1;
};

describe("drawBoard", () => {
  it("is 4:3, as the board is", () => {
    expect(BOARD_IMAGE_WIDTH / BOARD_IMAGE_HEIGHT).toBeCloseTo(4 / 3, 6);
  });

  it("lays the paper, then the background picture over the whole of it", async () => {
    const ops = await draw(scene());
    expect(ops[0]).toMatchObject({
      op: "fillRect",
      fill: "#ffffff",
      rect: [0, 0, W, BOARD_IMAGE_HEIGHT],
    });
    expect(ops[1]).toMatchObject({
      op: "drawImage",
      src: "/halloween/backgrounds/full/daphne-luther-hug.webp",
    });
  });

  it("repeats a tile across the board", async () => {
    const tiles = images(
      await draw(scene({ background: "tile-corkboard" })),
    ).filter((o) => o.src.endsWith("tile-corkboard.webp"));
    expect(tiles.length).toBeGreaterThan(1);
  });

  it("mutes the background, before any candy is drawn", async () => {
    const ops = await draw(scene());
    const muted = ops.findIndex(
      (o) => o.op === "fillRect" && o.blend === "saturation",
    );
    const firstCandy = ops.findIndex(
      (o) => o.op === "drawImage" && o.src.includes("/candy/"),
    );
    // Every background starts a little desaturated.
    expect(ops[muted]).toMatchObject({ alpha: 0.1 });
    expect(muted).toBeLessThan(firstCandy);
  });

  it("draws the candies bottom of the pile first, each with its shadow", async () => {
    const candies = images(await draw(scene())).filter((o) =>
      o.src.includes("/candy/"),
    );
    expect(candies.map((o) => o.src)).toEqual([
      "/halloween/candy/candy-corn.png",
      "/halloween/candy/luther-head.png",
    ]);
    // The shadow falls the board's way, whatever the candy's turn.
    const { dx, dy } = shadowOf(DEFAULT_LIGHTING, 0);
    for (const candy of candies) {
      expect(candy.shadow.x).toBeCloseTo((dx * W) / 100, 6);
      expect(candy.shadow.y).toBeCloseTo((dy * W) / 100, 6);
      expect(candy.shadow.colour).toMatch(/^rgba\(0, 0, 0, /);
    }
  });

  it("leaves out a candy whose picture will not load, and draws the rest", async () => {
    const candies = images(
      await draw(scene(), ["/halloween/candy/candy-corn.png"]),
    ).filter((o) => o.src.includes("/candy/"));
    expect(candies.map((o) => o.src)).toEqual([
      "/halloween/candy/luther-head.png",
    ]);
  });

  it("draws the nameplate of a named board, as the board does", async () => {
    const named = images(
      await draw(
        scene({
          name: { first: "Clover", joiner: null, last: "Coin" },
          placements: [
            { sticker: NAMEPLATE, x: 0.5, y: 0.2, rotation: 0, scale: 1 },
          ],
        }),
      ),
    );
    expect(named.some((o) => o.src.startsWith("data:image/svg+xml"))).toBe(
      true,
    );
    const unnamed = images(
      await draw(
        scene({
          placements: [
            { sticker: NAMEPLATE, x: 0.5, y: 0.2, rotation: 0, scale: 1 },
          ],
        }),
      ),
    );
    expect(unnamed.some((o) => o.src.startsWith("data:"))).toBe(false);
  });

  it("lays the light over everything: its colour, then the spotlight's glow and darkness", async () => {
    const ops = await draw(
      scene({
        lighting: {
          ...DEFAULT_LIGHTING,
          colour: "#f97316",
          colourStrength: 0.4,
          spotlight: 0.6,
        },
      }),
    );
    const lastCandy = lastCandyAt(ops);
    const light = ops
      .slice(lastCandy + 1)
      .flatMap((o) => (o.op === "fillRect" ? [o.blend] : []));
    expect(light).toEqual(["multiply", "soft-light", "source-over"]);
  });

  it("lays no light over a board under the default light", async () => {
    const ops = await draw(scene());
    expect(ops.slice(lastCandyAt(ops) + 1)).toEqual([]);
  });
});

describe("drawBoard, with the board's choices left out", () => {
  const bare: BoardImageOptions = { background: false, shadows: true };

  it("draws no paper or background picture, and does not mute what is not there", async () => {
    const ops = await draw(scene(), [], bare);
    expect(ops[0]).toMatchObject({
      op: "drawImage",
      src: "/halloween/candy/candy-corn.png",
    });
    expect(ops.some((o) => o.op === "fillRect")).toBe(false);
  });

  it("draws the candies without their shadows", async () => {
    const candies = images(
      await draw(scene(), [], { background: true, shadows: false }),
    ).filter((o) => o.src.includes("/candy/"));
    expect(candies).toHaveLength(2);
    for (const candy of candies) {
      expect(candy.shadow).toEqual({
        colour: "rgba(0, 0, 0, 0)",
        x: 0,
        y: 0,
        blur: 0,
      });
    }
  });

  it("lights the candies alone: the light is cut back to what was drawn under it", async () => {
    const ops = await draw(
      scene({
        lighting: { ...DEFAULT_LIGHTING, colour: "#f97316", spotlight: 0.6 },
      }),
      [],
      bare,
    );
    // What was drawn before the light, copied to be cut to.
    expect(ops.layers).toHaveLength(1);
    expect(ops.layers[0]).toEqual([
      expect.objectContaining({ op: "drawImage", src: "canvas:board" }),
    ]);
    const last = ops[ops.length - 1];
    expect(last).toMatchObject({
      op: "drawImage",
      src: "canvas:mask",
      blend: "destination-in",
    });
    expect(lastCandyAt(ops)).toBeLessThan(ops.length - 2);
  });

  it("needs no cutting under the default light", async () => {
    const ops = await draw(scene(), [], bare);
    expect(ops.layers).toEqual([]);
    expect(ops.slice(lastCandyAt(ops) + 1)).toEqual([]);
  });
});

describe("downloadBoardImage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("saves the picture, named for the board, and lets it go only once saving has begun", async () => {
    vi.useFakeTimers();
    const { ctx } = recorder();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (done: BlobCallback) => done(new Blob(["png"])),
    );
    const created = vi.fn(() => "blob:board");
    const revoked = vi.fn();
    Object.assign(URL, { createObjectURL: created, revokeObjectURL: revoked });
    const saved: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      saved.push(this.download);
    });

    await downloadBoardImage(
      scene({ name: { first: "Clover", joiner: null, last: "Coin" } }),
      undefined,
      loader(),
    );

    expect(saved).toEqual(["clover-coin.png"]);
    // Some browsers start the download after the click returns: let go now,
    // and the download can come to nothing.
    expect(revoked).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoked).toHaveBeenCalledWith("blob:board");
  });
});
