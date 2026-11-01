/**
 * The dashboard's simulators: a knock and a prize draw rolled as `/knock`
 * rolls them, and a forecast of when the prizes run out.
 */
import { describe, it, expect } from "vitest";
import {
  drawPrize,
  forecastRunOut,
  histogram,
  quantile,
  simulateKnock,
  type Rng,
} from "../eventSimulation";

/** Rolls these values in turn. */
const scripted = (...values: number[]): Rng => {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error("ran out of scripted rolls");
    return values[i++];
  };
};

/** A seeded generator (mulberry32), so statistical tests are repeatable. */
const seeded = (seed: number): Rng => {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const prizes = [
  { id: "gone", currentStock: 0, weight: 100 },
  { id: "one", currentStock: 1, weight: 10 },
  { id: "two", currentStock: 2, weight: 5 },
];

describe("drawPrize", () => {
  it("picks by stock times weight, skipping prizes with none left", () => {
    // "one" and "two" weigh 10 each.
    expect(drawPrize(prizes, scripted(0))?.id).toBe("one");
    expect(drawPrize(prizes, scripted(0.49))?.id).toBe("one");
    expect(drawPrize(prizes, scripted(0.5))?.id).toBe("two");
    expect(drawPrize(prizes, scripted(0.999))?.id).toBe("two");
  });

  it("draws nothing from an empty pool", () => {
    expect(drawPrize([prizes[0]], scripted())).toBeNull();
  });
});

describe("simulateKnock", () => {
  const candies = ["candy-corn", "caramel-apple", "luther-head"];

  it("wins under the win rate, then draws a prize", () => {
    expect(simulateKnock(prizes, 0.25, candies, scripted(0.2, 0.6))).toEqual({
      kind: "win",
      roll: 0.2,
      prize: prizes[2],
    });
  });

  it("loses at the win rate or over it, with a candy", () => {
    expect(simulateKnock(prizes, 0.25, candies, scripted(0.25, 0.4))).toEqual({
      kind: "loss",
      roll: 0.25,
      candySlug: "caramel-apple",
    });
  });

  it("is out of prizes before rolling, as /knock refuses", () => {
    expect(simulateKnock([prizes[0]], 1, candies, scripted())).toEqual({
      kind: "outOfPrizes",
    });
  });
});

describe("forecastRunOut", () => {
  it("runs out exactly when every knock wins", () => {
    const days = forecastRunOut({
      stock: 10,
      winRate: 1,
      knocksPerDay: 20,
      runs: 50,
      rng: seeded(1),
    });
    expect(days).not.toBeNull();
    expect([...(days ?? [])].every((d) => d === 0.5)).toBe(true);
  });

  it("centres on stock / (win rate x knocks a day)", () => {
    // 100 wins at 10% takes 1000 knocks: 10 days at 100 a day.
    const days = forecastRunOut({
      stock: 100,
      winRate: 0.1,
      knocksPerDay: 100,
      runs: 4000,
      rng: seeded(7),
    });
    expect(days).not.toBeNull();
    const sorted = days ?? new Float64Array();
    expect(quantile(sorted, 0.5)).toBeGreaterThan(9.5);
    expect(quantile(sorted, 0.5)).toBeLessThan(10.5);
    // Sorted, for quantiles.
    expect(sorted[0]).toBeLessThanOrEqual(sorted[sorted.length - 1]);
  });

  it("never runs out without wins or knocks", () => {
    const base = { stock: 5, runs: 10, rng: seeded(1) };
    expect(forecastRunOut({ ...base, winRate: 0, knocksPerDay: 10 })).toBeNull();
    expect(forecastRunOut({ ...base, winRate: 0.1, knocksPerDay: 0 })).toBeNull();
  });

  it("has already run out with no stock", () => {
    const days = forecastRunOut({
      stock: 0,
      winRate: 0.1,
      knocksPerDay: 10,
      runs: 3,
      rng: seeded(1),
    });
    expect([...(days ?? [])]).toEqual([0, 0, 0]);
  });
});

describe("histogram", () => {
  it("counts runs in quarter-day buckets", () => {
    expect(histogram(Float64Array.from([0.1, 0.2, 0.3, 0.6]), 0.25)).toEqual([
      { from: 0, count: 2 },
      { from: 0.25, count: 1 },
      { from: 0.5, count: 1 },
    ]);
  });

  it("keeps empty buckets between full ones", () => {
    expect(histogram(Float64Array.from([0.1, 0.8]), 0.25)).toEqual([
      { from: 0, count: 1 },
      { from: 0.25, count: 0 },
      { from: 0.5, count: 0 },
      { from: 0.75, count: 1 },
    ]);
  });

  it("folds the far tails into the end buckets", () => {
    // One stray run at 100 days among 999 near 1 day.
    const days = Float64Array.from([...Array(999).fill(1.1), 100]);
    const buckets = histogram(days, 0.25, 0.001);
    expect(buckets).toEqual([{ from: 1, count: 1000 }]);
  });
});
