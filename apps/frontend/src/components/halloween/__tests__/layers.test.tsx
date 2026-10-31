import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { rulesFor } from "../../../__tests__/emittedCss";
import { BackgroundEffectLayers } from "../BackgroundEffectLayers";
import { LightLayers } from "../LightLayers";
import { effectLayers } from "../backgroundEffects";
import {
  DEFAULT_LIGHTING,
  lightWash,
  spotlightGlow,
  spotlightLayer,
} from "../candyLighting";
import * as styles from "../layers.css";
import { layerVars } from "../layers";

/** The value an element sets inline for a variable made with createVar. */
const varOn = (el: Element | null, cssVar: string) =>
  (el as HTMLElement).style.getPropertyValue(cssVar.slice("var(".length, -1));

const effects = {
  dim: 0.4,
  tint: "#7c3aed",
  tintStrength: 0.5,
  saturation: 0.9,
};
const light = {
  ...DEFAULT_LIGHTING,
  colour: "#f97316",
  colourStrength: 0.35,
  spotlight: 0.6,
  cone: 0.3,
};

describe("Halloween layers", () => {
  it("draw their colours from the effects, as variables on a shared class", () => {
    const { container } = render(<BackgroundEffectLayers effects={effects} />);
    const tint = container.querySelector('[data-testid="background-tint"]');

    expect(tint?.classList.contains(styles.fill)).toBe(true);
    expect(varOn(tint, styles.backgroundColor)).toBe("#7c3aed");
    expect(varOn(tint, styles.opacity)).toBe("0.5");
    expect(varOn(tint, styles.blendMode)).toBe("color");
    // Only variables inline; the stylesheet owns the declarations.
    expect((tint as HTMLElement).style.opacity).toBe("");
  });

  it("cover the surface they are laid over, and take no clicks", () => {
    expect(rulesFor(styles.fill)[0].declarations).toMatchObject({
      position: "absolute",
      inset: "0",
      "pointer-events": "none",
      "background-color": styles.backgroundColor,
      opacity: styles.opacity,
      "mix-blend-mode": styles.blendMode,
      "background-image": styles.backgroundImage,
    });
  });

  it("place a spotlight's square from the lighting", () => {
    const { container } = render(<LightLayers lighting={light} />);
    const spot = container.querySelector('[data-testid="light-spotlight"]');
    const expected = spotlightLayer(light)!;

    expect(spot?.classList.contains(styles.pool)).toBe(true);
    expect(varOn(spot, styles.left)).toBe(expected.left);
    expect(varOn(spot, styles.top)).toBe(expected.top);
    expect(varOn(spot, styles.width)).toBe(expected.width);
    expect(varOn(spot, styles.transform)).toBe(expected.transform);
    expect(varOn(spot, styles.backgroundImage)).toBe(expected.backgroundImage);
    expect(rulesFor(styles.pool)[0].declarations).toMatchObject({
      position: "absolute",
      "pointer-events": "none",
      left: styles.left,
      top: styles.top,
      width: styles.width,
      "aspect-ratio": "1",
      transform: styles.transform,
    });
  });

  // `boardImage.ts` draws the same layers from the same helpers; anything
  // they return that has no variable here would be silently dropped.
  it("carry every property the layer helpers return", () => {
    const layers = [
      ...Object.values(effectLayers(effects)),
      lightWash(light),
      spotlightGlow(light),
      spotlightLayer(light),
    ];
    for (const layer of layers) {
      expect(layer).not.toBeNull();
      const carried = Object.keys(layerVars(layer!)).length;
      // aspectRatio is fixed by the pool class.
      const expected = Object.keys(layer!).filter(
        (key) => key !== "aspectRatio",
      ).length;
      expect(carried).toBe(expected);
    }
  });
});
