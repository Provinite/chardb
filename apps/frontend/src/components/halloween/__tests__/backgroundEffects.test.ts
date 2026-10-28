/**
 * How a candy board's background is muted behind its candies.
 */
import { describe, it, expect } from "vitest";
import {
  DEFAULT_SATURATION,
  NO_EFFECTS,
  TINT_PALETTE,
  effectLayers,
  savedEffects,
} from "../backgroundEffects";

describe("effectLayers", () => {
  it("mutes a background left alone a little, and nothing more", () => {
    expect(DEFAULT_SATURATION).toBe(0.9);
    const { saturate, tint, dim } = effectLayers(null);
    expect(saturate?.opacity).toBeCloseTo(0.1, 6);
    expect(tint).toBe(null);
    expect(dim).toBe(null);
    expect(effectLayers(NO_EFFECTS)).toEqual(effectLayers(null));
  });

  it("greys the background as far as its saturation is down", () => {
    const { saturate } = effectLayers({ ...NO_EFFECTS, saturation: 0.25 });
    expect(saturate).toEqual({
      backgroundColor: "#808080",
      opacity: 0.75,
      mixBlendMode: "saturation",
    });
  });

  it("draws no grey at full saturation", () => {
    expect(effectLayers({ ...NO_EFFECTS, saturation: 1 }).saturate).toBe(null);
  });

  it("darkens with black, as far as it is dimmed", () => {
    expect(effectLayers({ ...NO_EFFECTS, dim: 0.4 }).dim).toEqual({
      backgroundColor: "#000000",
      opacity: 0.4,
    });
  });

  it("recolours with the tint, keeping the picture's light and dark", () => {
    expect(
      effectLayers({ ...NO_EFFECTS, tint: "#7c3aed", tintStrength: 0.6 }).tint,
    ).toEqual({
      backgroundColor: "#7c3aed",
      opacity: 0.6,
      mixBlendMode: "color",
    });
  });

  it("draws no tint at no strength", () => {
    expect(
      effectLayers({ ...NO_EFFECTS, tint: "#7c3aed", tintStrength: 0 }).tint,
    ).toBe(null);
  });
});

describe("savedEffects", () => {
  it("saves nothing for a background left as it starts", () => {
    expect(savedEffects(NO_EFFECTS)).toBe(null);
    expect(
      savedEffects({ ...NO_EFFECTS, tint: "#7c3aed", tintStrength: 0 }),
    ).toBe(null);
  });

  it("saves a dim, a tint or a saturation as it is", () => {
    for (const effects of [
      { ...NO_EFFECTS, dim: 0.3 },
      { ...NO_EFFECTS, tint: "#7c3aed", tintStrength: 0.5 },
      { ...NO_EFFECTS, saturation: 1 },
    ]) {
      expect(savedEffects(effects)).toEqual(effects);
    }
  });
});

describe("TINT_PALETTE", () => {
  it("names six #rrggbb colours", () => {
    expect(TINT_PALETTE).toHaveLength(6);
    for (const { colour, name } of TINT_PALETTE) {
      expect(colour).toMatch(/^#[0-9a-f]{6}$/);
      expect(name).not.toBe("");
    }
  });
});
