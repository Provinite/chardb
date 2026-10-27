import React, { type CSSProperties } from "react";
import { effectLayers, type BackgroundEffects } from "./backgroundEffects";

const layer: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

/**
 * The tint, then the dim over it, laid over a background. Drawn before the
 * candies, so they lie on top.
 */
export const BackgroundEffectLayers: React.FC<{
  effects: BackgroundEffects | null;
}> = ({ effects }) => {
  const { tint, dim } = effectLayers(effects);
  return (
    <>
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
