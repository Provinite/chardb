/**
 * How a candy board's background is drawn: a picture fills the board, a tile
 * repeats at a size relative to the board, so a shared board looks the same
 * however wide the screen showing it is.
 */
import { describe, it, expect } from "vitest";
import {
  backgroundName,
  backgroundStyle,
  REFERENCE_BOARD_WIDTH,
} from "../boardBackgrounds";

describe("backgroundStyle", () => {
  it("leaves the board's own night sky alone", () => {
    expect(backgroundStyle(null)).toEqual({});
  });

  it("fills the board with a full picture", () => {
    expect(
      backgroundStyle({
        slug: "daphne-luther-hug",
        kind: "full",
        width: 1600,
        height: 1200,
      }),
    ).toEqual({
      backgroundImage:
        "url(/halloween/backgrounds/full/daphne-luther-hug.webp)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    });
  });

  it("repeats a tile at half its pixel size on a board of the reference width", () => {
    const style = backgroundStyle({
      slug: "tile-corkboard",
      kind: "tile",
      width: 500,
      height: 500,
    });
    expect(style.backgroundImage).toBe(
      "url(/halloween/backgrounds/tiles/tile-corkboard.webp)",
    );
    expect(style.backgroundRepeat).toBe("repeat");
    // 250px across a board REFERENCE_BOARD_WIDTH wide, as a share of it.
    expect(style.backgroundSize).toBe(
      `${(250 / REFERENCE_BOARD_WIDTH) * 100}% auto`,
    );
  });
});

describe("backgroundName", () => {
  it("names a background for people, without its tile- prefix", () => {
    expect(backgroundName("tile-teal-daisies")).toBe("teal daisies");
    expect(backgroundName("daphne-luther-hug")).toBe("daphne luther hug");
  });
});
