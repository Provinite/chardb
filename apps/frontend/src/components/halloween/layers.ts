import type { CSSProperties } from "react";
import * as styles from "./layers.css";

/**
 * A layer from `effectLayers`, `lightWash`, `spotlightGlow` or
 * `spotlightLayer`, as values for the variables `layers.css.ts` reads, for
 * `assignInlineVars`. Those helpers stay plain style objects because
 * `boardImage.ts` draws the same layers to a canvas.
 */
export const layerVars = (layer: CSSProperties): Record<string, string> => {
  const values: Record<string, string | number | undefined> = {
    [styles.backgroundColor]: layer.backgroundColor,
    [styles.opacity]: layer.opacity,
    [styles.blendMode]: layer.mixBlendMode,
    [styles.backgroundImage]: layer.backgroundImage,
    [styles.left]: layer.left,
    [styles.top]: layer.top,
    [styles.width]: layer.width,
    [styles.transform]: layer.transform,
  };
  return Object.fromEntries(
    Object.entries(values)
      .filter(
        (entry): entry is [string, string | number] => entry[1] !== undefined,
      )
      .map(([name, value]) => [name, String(value)]),
  );
};
