/**
 * How the light over a candy board casts each candy's shadow.
 */
import { describe, it, expect } from "vitest";
import {
  DEFAULT_LIGHTING,
  MAX_SHADOW_LENGTH,
  clampLighting,
  shadowOf,
  shadowFilter,
} from "../candyLighting";

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe("shadowOf", () => {
  it("casts a shadow away from the light", () => {
    // A light off to the left throws shadows to the right.
    const s = shadowOf({ x: -0.5, y: 0, height: 0.5 }, 0);
    expect(s.dx).toBeGreaterThan(0);
    close(s.dy, 0);
  });

  it("casts no offset from a light straight overhead", () => {
    const s = shadowOf({ x: 0, y: 0, height: 0.3 }, 0);
    close(s.dx, 0);
    close(s.dy, 0);
  });

  it("casts shorter shadows from a higher light", () => {
    const low = shadowOf({ x: 0.5, y: 0, height: 0.2 }, 0);
    const high = shadowOf({ x: 0.5, y: 0, height: 0.8 }, 0);
    expect(Math.abs(high.dx)).toBeLessThan(Math.abs(low.dx));
  });

  it("softens and fades a longer shadow", () => {
    const short = shadowOf({ x: 0.2, y: 0, height: 1 }, 0);
    const long = shadowOf({ x: 1, y: 0, height: 0.2 }, 0);
    expect(long.blur).toBeGreaterThan(short.blur);
    expect(long.opacity).toBeLessThan(short.opacity);
  });

  it("never casts a shadow longer than the most it may", () => {
    const s = shadowOf({ x: 1, y: 0, height: 0.1 }, 0);
    close(Math.hypot(s.dx, s.dy), MAX_SHADOW_LENGTH);
  });

  it("turns the offset back against a candy's rotation, so every shadow falls the same way", () => {
    // Light from the top: shadows fall down the board. On a candy turned a
    // quarter clockwise, the board's "down" is the candy's own "right".
    const light = { x: 0, y: -0.5, height: 0.5 };
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
    expect(shadowFilter({ x: -0.5, y: 0, height: 0.5 }, 0)).toMatch(
      /^drop-shadow\([\d.]+cqw -?[\d.]+cqw [\d.]+cqw rgba\(0, 0, 0, [\d.]+\)\)$/,
    );
  });

  it("uses the default light when none is set", () => {
    expect(shadowFilter(null, 0)).toBe(shadowFilter(DEFAULT_LIGHTING, 0));
  });
});

describe("clampLighting", () => {
  it("keeps the light inside the circle and its height in range", () => {
    const l = clampLighting({ x: 3, y: 4, height: 2 });
    close(Math.hypot(l.x, l.y), 1);
    close(l.x / l.y, 3 / 4);
    expect(l.height).toBe(1);
    expect(clampLighting({ x: 0, y: 0, height: 0 }).height).toBe(0.1);
  });
});
