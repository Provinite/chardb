/**
 * How the light over a candy board casts each candy's shadow.
 */
import { describe, it, expect } from "vitest";
import {
  DEFAULT_LIGHTING,
  MAX_SHADOW_LENGTH,
  clampLighting,
  shadowOf,
  lightWash,
  shadowFilter,
  type Lighting,
} from "../candyLighting";

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

/** A light at the usual intensity. */
const at = (x: number, y: number, height: number): Lighting => ({
  x,
  y,
  height,
  intensity: 0.5,
  colour: null,
  colourStrength: 0,
});

describe("lightWash", () => {
  it("washes nothing under a white light", () => {
    expect(lightWash(null)).toBe(null);
    expect(lightWash(DEFAULT_LIGHTING)).toBe(null);
    expect(lightWash({ ...at(0, 0, 0.5), colour: "#f97316" })).toBe(null);
  });

  it("multiplies the board by the light's colour, as far as it is strong", () => {
    expect(
      lightWash({ ...at(0, 0, 0.5), colour: "#f97316", colourStrength: 0.4 }),
    ).toEqual({
      backgroundColor: "#f97316",
      opacity: 0.4,
      mixBlendMode: "multiply",
    });
  });
});

describe("shadowOf", () => {
  it("casts a shadow away from the light", () => {
    // A light off to the left throws shadows to the right.
    const s = shadowOf(at(-0.5, 0, 0.5), 0);
    expect(s.dx).toBeGreaterThan(0);
    close(s.dy, 0);
  });

  it("casts no offset from a light straight overhead", () => {
    const s = shadowOf(at(0, 0, 0.3), 0);
    close(s.dx, 0);
    close(s.dy, 0);
  });

  it("casts shorter shadows from a higher light", () => {
    const low = shadowOf(at(0.5, 0, 0.2), 0);
    const high = shadowOf(at(0.5, 0, 0.8), 0);
    expect(Math.abs(high.dx)).toBeLessThan(Math.abs(low.dx));
  });

  it("softens and fades a longer shadow", () => {
    const short = shadowOf(at(0.2, 0, 1), 0);
    const long = shadowOf(at(1, 0, 0.2), 0);
    expect(long.blur).toBeGreaterThan(short.blur);
    expect(long.opacity).toBeLessThan(short.opacity);
  });

  it("darkens and sharpens a shadow with a stronger light, at the same length", () => {
    const faint = shadowOf({ ...at(0.5, 0, 0.5), intensity: 0 }, 0);
    const strong = shadowOf({ ...at(0.5, 0, 0.5), intensity: 1 }, 0);
    expect(strong.opacity).toBeGreaterThan(faint.opacity);
    expect(strong.blur).toBeLessThan(faint.blur);
    close(strong.dx, faint.dx);
    close(strong.dy, faint.dy);
  });

  it("doubles a shadow's darkness at full intensity, never past opaque", () => {
    const usual = shadowOf(at(0.2, 0, 1), 0);
    const strong = shadowOf({ ...at(0.2, 0, 1), intensity: 1 }, 0);
    close(strong.opacity, 2 * usual.opacity);
    close(strong.blur, usual.blur / 2);
    expect(strong.opacity).toBeLessThanOrEqual(1);
  });

  it("never casts a shadow longer than the most it may", () => {
    const s = shadowOf(at(1, 0, 0.1), 0);
    close(Math.hypot(s.dx, s.dy), MAX_SHADOW_LENGTH);
  });

  it("turns the offset back against a candy's rotation, so every shadow falls the same way", () => {
    // Light from the top: shadows fall down the board. On a candy turned a
    // quarter clockwise, the board's "down" is the candy's own "right".
    const light = at(0, -0.5, 0.5);
    const upright = shadowOf(light, 0);
    const turned = shadowOf(light, 90);
    close(turned.dx, upright.dy);
    close(turned.dy, 0);
  });

  it("falls a little way down the board under the default light", () => {
    const s = shadowOf(DEFAULT_LIGHTING, 0);
    close(s.dx, 0);
    expect(s.dy).toBeGreaterThan(0);
  });
});

describe("shadowFilter", () => {
  it("draws the shadow in units of the board's width", () => {
    expect(shadowFilter(at(-0.5, 0, 0.5), 0)).toMatch(
      /^drop-shadow\([\d.]+cqw -?[\d.]+cqw [\d.]+cqw rgba\(0, 0, 0, [\d.]+\)\)$/,
    );
  });

  it("uses the default light when none is set", () => {
    expect(shadowFilter(null, 0)).toBe(shadowFilter(DEFAULT_LIGHTING, 0));
  });
});

describe("clampLighting", () => {
  it("keeps the light inside the circle, and its height and intensity in range", () => {
    const l = clampLighting({
      ...at(3, 4, 2),
      intensity: 3,
      colourStrength: 3,
    });
    close(Math.hypot(l.x, l.y), 1);
    close(l.x / l.y, 3 / 4);
    expect(l.height).toBe(1);
    expect(l.intensity).toBe(1);
    expect(l.colourStrength).toBe(1);
    const low = clampLighting({
      ...at(0, 0, 0),
      intensity: -1,
      colourStrength: -1,
    });
    expect(low.height).toBe(0.1);
    expect(low.intensity).toBe(0);
    expect(low.colourStrength).toBe(0);
  });
});
