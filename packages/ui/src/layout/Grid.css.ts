import { createVar } from "@vanilla-extract/css";
import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { track } from "../css/track";
import { vars } from "../theme/contract.css";

export const minTrack = createVar();
export const repeatMode = createVar();

const columnSizes = Object.fromEntries(
  Object.entries(vars.size.column).map(([name, size]) => [
    name,
    { vars: { [minTrack]: size } },
  ]),
) as Record<keyof typeof vars.size.column, { vars: Record<string, string> }>;

export const grid = recipe({
  base: {
    display: "grid",
    // min() keeps a track from overflowing a grid narrower than the minimum.
    gridTemplateColumns: `repeat(${repeatMode}, ${track.fr(1, `min(${minTrack}, 100%)`)})`,
  },
  variants: {
    min: columnSizes,
    repeat: {
      fit: { vars: { [repeatMode]: "auto-fit" } },
      fill: { vars: { [repeatMode]: "auto-fill" } },
    },
  },
  defaultVariants: { repeat: "fit" },
});

export type GridVariants = NonNullable<RecipeVariants<typeof grid>>;
