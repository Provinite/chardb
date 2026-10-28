import React, { type CSSProperties } from "react";
import { effectLayers, type BackgroundEffects } from "./backgroundEffects";

const layer: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

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
          style={{ ...layer, ...saturate }}
        />
      )}
      {tint && (
        <div
          data-testid="background-tint"
          aria-hidden
          style={{ ...layer, ...tint }}
        />
      )}
      {dim && (
        <div
          data-testid="background-dim"
          aria-hidden
          style={{ ...layer, ...dim }}
        />
      )}
    </>
  );
};
