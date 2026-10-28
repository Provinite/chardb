import React, { type CSSProperties } from "react";
import { lightWash, type Lighting } from "./candyLighting";

const layer: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

/**
 * What the board's light lays over everything under it: its colour. Drawn
 * last on a surface -- the board, or the background dialog's preview, so a
 * background is chosen as it will look -- and under the selection's handles.
 */
export const LightLayers: React.FC<{ lighting: Lighting | null }> = ({
  lighting,
}) => {
  const wash = lightWash(lighting);
  return wash ? (
    <div data-testid="light-wash" aria-hidden style={{ ...layer, ...wash }} />
  ) : null;
};
