/**
 * What can go behind a candy board's candies: one of the pictures and tiles
 * in public/halloween/backgrounds (listed by `yarn halloween:images` into
 * backgrounds.generated.ts), graph paper on a board with none chosen.
 *
 * A picture fills the board. A tile repeats, sized as a share of the board's
 * width rather than in pixels, so a shared board looks the same however wide
 * the screen showing it is -- as the candies, placed by fraction, do.
 */
import type { CSSProperties } from "react";
import {
  BOARD_BACKGROUNDS,
  type BoardBackground,
} from "./backgrounds.generated";

export { BOARD_BACKGROUNDS, type BoardBackground };

/** What a board with no background chosen shows. */
export const DEFAULT_BACKGROUND = "tile-graph-paper";

/** Under a background while its picture loads: graph paper's paper. */
export const SURFACE_COLOUR = "#ffffff";

/**
 * The board width a tile's size is set against: a tile is shown at half its
 * pixel size on a board this many CSS pixels wide, and in proportion on any
 * other. About as wide as the board is on a desktop screen.
 */
export const REFERENCE_BOARD_WIDTH = 900;

const DEFAULT: BoardBackground = (() => {
  const found = BOARD_BACKGROUNDS.find((b) => b.slug === DEFAULT_BACKGROUND);
  if (!found) throw new Error("The default candy board background is missing");
  return found;
})();

/**
 * A board's background: the one chosen, or graph paper with none chosen --
 * or one chosen that there is no longer a picture for.
 */
export function backgroundOf(slug: string | null | undefined): BoardBackground {
  return BOARD_BACKGROUNDS.find((b) => b.slug === slug) ?? DEFAULT;
}

export const backgroundUrl = ({ slug, kind }: BoardBackground) =>
  `/halloween/backgrounds/${kind === "full" ? "full" : "tiles"}/${slug}.webp`;

/** How to draw a background on a surface. */
export function backgroundStyle(background: BoardBackground): CSSProperties {
  const backgroundImage = `url(${backgroundUrl(background)})`;
  if (background.kind === "full") {
    return {
      backgroundImage,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  const share = (background.width / 2 / REFERENCE_BOARD_WIDTH) * 100;
  return {
    backgroundImage,
    backgroundSize: `${share}% auto`,
    backgroundRepeat: "repeat",
  };
}

/** "tile-teal-daisies" -> "teal daisies": what a background is called. */
export const backgroundName = (slug: string) =>
  slug.replace(/^tile-/, "").replace(/-/g, " ");
