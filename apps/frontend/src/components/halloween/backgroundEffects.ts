/**
 * What mutes a candy board's background, for a picture too busy behind its
 * candies: a black layer dims it, and a coloured layer recolours it toward
 * one hue (`mix-blend-mode: color`), which keeps the picture's light and dark
 * but calms its clashing colours. Both lie over the background and under the
 * candies; the surface they lie on must isolate, so the tint blends with the
 * background alone. The limits mirror the backend's (candy-board.schema.ts).
 */
import type { CSSProperties } from "react";
import type { HalloweenCandyBackgroundEffects } from "../../generated/graphql";

export type BackgroundEffects = Omit<
  HalloweenCandyBackgroundEffects,
  "__typename"
>;

export const BACKGROUND_DIM_MAX = 0.8;

/** How strong a tint starts when one is first picked. */
export const DEFAULT_TINT_STRENGTH = 0.6;

export const NO_EFFECTS: BackgroundEffects = {
  dim: 0,
  tint: null,
  tintStrength: 0,
};

export const TINT_PALETTE = [
  { colour: "#f97316", name: "Pumpkin" },
  { colour: "#7c3aed", name: "Witch purple" },
  { colour: "#65a30d", name: "Slime green" },
  { colour: "#1e3a8a", name: "Midnight" },
  { colour: "#991b1b", name: "Blood red" },
  { colour: "#e7e5e4", name: "Bone" },
] as const;

/** The layers to lay over a background; null for one not drawn. */
export function effectLayers(effects: BackgroundEffects | null): {
  tint: CSSProperties | null;
  dim: CSSProperties | null;
} {
  const { dim, tint, tintStrength } = effects ?? NO_EFFECTS;
  return {
    tint:
      tint && tintStrength > 0
        ? {
            backgroundColor: tint,
            opacity: tintStrength,
            mixBlendMode: "color",
          }
        : null,
    dim: dim > 0 ? { backgroundColor: "#000000", opacity: dim } : null,
  };
}

/** What to save: null for a background neither dimmed nor tinted. */
export function savedEffects(
  effects: BackgroundEffects,
): BackgroundEffects | null {
  const { tint, dim } = effectLayers(effects);
  return tint || dim ? effects : null;
}
