import { styleVariants } from "@vanilla-extract/css";
import { track } from "./track";

const ratios = {
  "1:1": [1, 1],
  "2:1": [2, 1],
  "1:2": [1, 2],
  "1:1:1": [1, 1, 1],
  "3:1": [3, 1],
} as const;

/**
 * Grids whose columns share the width in a ratio: `split["2:1"]`. The gap is
 * the caller's, so it has one source.
 */
export const split = styleVariants(ratios, (shares) => ({
  display: "grid",
  gridTemplateColumns: shares.map((share) => track.fr(share)).join(" "),
}));
