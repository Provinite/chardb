import React from "react";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import { effectLayers, type BackgroundEffects } from "./backgroundEffects";
import { layerVars } from "./layers";
import * as styles from "./layers.css";

/**
 * The grey, the tint, then the dim over them, laid over a background. Drawn before the
 * candies, so they lie on top.
 */
export const BackgroundEffectLayers: React.FC<{
  effects: BackgroundEffects | null;
}> = ({ effects }) => {
  const { saturate, tint, dim } = effectLayers(effects);
  return (
    <>
      {saturate && (
        <div
          data-testid="background-saturation"
          aria-hidden
          className={styles.fill}
          style={assignInlineVars(layerVars(saturate))}
        />
      )}
      {tint && (
        <div
          data-testid="background-tint"
          aria-hidden
          className={styles.fill}
          style={assignInlineVars(layerVars(tint))}
        />
      )}
      {dim && (
        <div
          data-testid="background-dim"
          aria-hidden
          className={styles.fill}
          style={assignInlineVars(layerVars(dim))}
        />
      )}
    </>
  );
};
