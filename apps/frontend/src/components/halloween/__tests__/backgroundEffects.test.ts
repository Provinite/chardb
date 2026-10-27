/**
 * How a candy board's background is dimmed and tinted behind its candies.
 */
import { describe, it, expect } from "vitest";
import {
  NO_EFFECTS,
  TINT_PALETTE,
  effectLayers,
  savedEffects,
} from "../backgroundEffects";

describe("effectLayers", () => {
  it("draws nothing over a background left alone", () => {
    expect(effectLayers(null)).toEqual({ tint: null, dim: null });
    expect(effectLayers(NO_EFFECTS)).toEqual({ tint: null, dim: null });
  });

  it("darkens with black, as far as it is dimmed", () => {
    expect(effectLayers({ ...NO_EFFECTS, dim: 0.4 }).dim).toEqual({
      backgroundColor: "#000000",
      opacity: 0.4,
    });
  });

  it("recolours with the tint, keeping the picture's light and dark", () => {
    expect(
      effectLayers({ dim: 0, tint: "#7c3aed", tintStrength: 0.6 }).tint,
    ).toEqual({
      backgroundColor: "#7c3aed",
      opacity: 0.6,
      mixBlendMode: "color",
    });
  });

  it("draws no tint at no strength", () => {
    expect(
      effectLayers({ dim: 0, tint: "#7c3aed", tintStrength: 0 }).tint,
    ).toBe(null);
  });
});

describe("savedEffects", () => {
  it("saves nothing for a background left alone", () => {
    expect(savedEffects(NO_EFFECTS)).toBe(null);
    expect(savedEffects({ dim: 0, tint: "#7c3aed", tintStrength: 0 })).toBe(
      null,
    );
  });

  it("saves a dim or a tint as it is", () => {
    const effects = { dim: 0.3, tint: "#7c3aed", tintStrength: 0.5 };
    expect(savedEffects(effects)).toEqual(effects);
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
