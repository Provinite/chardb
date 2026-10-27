/**
 * What can go behind a candy board's candies: the board's own night sky, or
 * one of the pictures and tiles in public/halloween/backgrounds (listed by
 * `yarn halloween:images` into backgrounds.generated.ts).
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

/** The board's own background, when no picture or tile is chosen. */
export const NIGHT_SKY = [
  "radial-gradient(ellipse at 50% 120%, #f9731655 0%, #f9731600 55%)",
  "radial-gradient(circle at 82% 16%, #fde68a 0 3.5%, #fde68a00 4%)",
  "linear-gradient(180deg, #1e1b4b 0%, #3b0764 70%, #431407 100%)",
].join(", ");

/**
 * The board width a tile's size is set against: a tile is shown at half its
 * pixel size on a board this many CSS pixels wide, and in proportion on any
 * other. About as wide as the board is on a desktop screen.
 */
export const REFERENCE_BOARD_WIDTH = 900;

export function findBackground(
  slug: string | null | undefined,
): BoardBackground | null {
  return BOARD_BACKGROUNDS.find((b) => b.slug === slug) ?? null;
}

export const backgroundUrl = ({ slug, kind }: BoardBackground) =>
  `/halloween/backgrounds/${kind === "full" ? "full" : "tiles"}/${slug}.webp`;

/** How to draw a background on a surface; nothing for the night sky. */
export function backgroundStyle(
  background: BoardBackground | null,
): CSSProperties {
  if (!background) return {};
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
