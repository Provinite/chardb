import React, { type CSSProperties } from "react";
import {
  lightWash,
  spotlightGlow,
  spotlightLayer,
  type Lighting,
} from "./candyLighting";

const layer: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

/**
 * What the board's light lays over everything under it: its colour, then a
 * spotlight's glow inside its pool and darkness outside it. Drawn last on a surface -- the
 * board, or the background dialog's preview, so a background is chosen as it
 * will look -- and under the selection's handles. The surface must clip
 * what overflows it, as the spotlight's layer reaches well past its edges.
 */
export const LightLayers: React.FC<{ lighting: Lighting | null }> = ({
  lighting,
}) => {
  const wash = lightWash(lighting);
  const glow = spotlightGlow(lighting);
  const spotlight = spotlightLayer(lighting);
  return (
    <>
      {wash && (
        <div
          data-testid="light-wash"
          aria-hidden
          style={{ ...layer, ...wash }}
        />
      )}
      {glow && (
        <div
          data-testid="light-glow"
          aria-hidden
          style={{ position: "absolute", pointerEvents: "none", ...glow }}
        />
      )}
      {spotlight && (
        <div
          data-testid="light-spotlight"
          aria-hidden
          style={{
            position: "absolute",
            pointerEvents: "none",
            ...spotlight,
          }}
        />
      )}
    </>
  );
};
