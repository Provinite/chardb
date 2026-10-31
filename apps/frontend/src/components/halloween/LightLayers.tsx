import React from "react";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import {
  lightWash,
  spotlightGlow,
  spotlightLayer,
  type Lighting,
} from "./candyLighting";
import { layerVars } from "./layers";
import * as styles from "./layers.css";

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
          className={styles.fill}
          style={assignInlineVars(layerVars(wash))}
        />
      )}
      {glow && (
        <div
          data-testid="light-glow"
          aria-hidden
          className={styles.pool}
          style={assignInlineVars(layerVars(glow))}
        />
      )}
      {spotlight && (
        <div
          data-testid="light-spotlight"
          aria-hidden
          className={styles.pool}
          style={assignInlineVars(layerVars(spotlight))}
        />
      )}
    </>
  );
};
