import { knockWins, pickWeighted, prizeDrawWeight } from "@chardb/shared";

/** A number in [0, 1), as `Math.random` gives. */
export type Rng = () => number;

interface Drawable {
  currentStock: number;
  weight: number;
}

/**
 * A prize as `/knock` would draw it from the pool as it stands, without
 * taking it: by stock times weight, over the prizes with stock left.
 */
export function drawPrize<T extends Drawable>(
  prizes: readonly T[],
  rng: Rng,
): T | null {
  const pool = prizes.filter((p) => p.currentStock > 0);
  if (!pool.length) return null;
  const weights = pool.map(prizeDrawWeight);
  const total = weights.reduce((sum, w) => sum + w, 0);
  return pickWeighted(pool, weights, Math.floor(rng() * total));
}

export type SimulatedKnock<T> =
  | { kind: "win"; roll: number; prize: T }
  | { kind: "loss"; roll: number; candySlug: string }
  | { kind: "outOfPrizes" };

/**
 * A knock as `/knock` rolls it: refused with no stock left, else a win under
 * the win rate, which draws a prize, or a loss, which gives a random candy.
 */
export function simulateKnock<T extends Drawable>(
  prizes: readonly T[],
  winRate: number,
  candySlugs: readonly string[],
  rng: Rng,
): SimulatedKnock<T> {
  if (!prizes.some((p) => p.currentStock > 0)) {
    return { kind: "outOfPrizes" };
  }
  const roll = rng();
  if (knockWins(roll, winRate)) {
    const prize = drawPrize(prizes, rng);
    if (prize) return { kind: "win", roll, prize };
  }
  return {
    kind: "loss",
    roll,
    candySlug: candySlugs[Math.floor(rng() * candySlugs.length)],
  };
}

export interface RunOutInputs {
  /** Prize units left. */
  stock: number;
  winRate: number;
  /** Knocks the whole guild makes in a day. */
  knocksPerDay: number;
  runs: number;
  rng: Rng;
}

/**
 * Days until the last prize is won, once per run, sorted. Null if it never
 * happens: no wins, or no knocks.
 *
 * Each run counts the knocks it takes to win every unit left: the knocks
 * until a win are geometric, so it sums one geometric draw per unit. Knocks
 * arrive at a steady `knocksPerDay`, so the spread is the luck of the dice
 * alone, not the crowd's comings and goings.
 */
export function forecastRunOut({
  stock,
  winRate,
  knocksPerDay,
  runs,
  rng,
}: RunOutInputs): Float64Array | null {
  if (winRate <= 0 || knocksPerDay <= 0) return null;
  const days = new Float64Array(runs);
  // ln(1 - p); -Infinity at p = 1, where every knock wins.
  const logMiss = Math.log(1 - Math.min(winRate, 1));
  for (let run = 0; run < runs; run++) {
    let knocks = 0;
    for (let unit = 0; unit < stock; unit++) {
      knocks += Math.max(1, Math.ceil(Math.log(1 - rng()) / logMiss));
    }
    days[run] = knocks / knocksPerDay;
  }
  return days.sort();
}

/** The `q` quantile of sorted values, interpolating between neighbours. */
export function quantile(sorted: Float64Array, q: number): number {
  if (!sorted.length) return Number.NaN;
  const at = q * (sorted.length - 1);
  const below = Math.floor(at);
  const above = Math.min(below + 1, sorted.length - 1);
  return sorted[below] + (at - below) * (sorted[above] - sorted[below]);
}

export interface Bucket {
  /** Where the bucket starts, in days. */
  from: number;
  count: number;
}

/**
 * Sorted values counted into buckets `width` wide, every bucket from the
 * lowest to the highest included. Values beyond the `tail` and `1 - tail`
 * quantiles are counted in the end buckets, so one unlucky run cannot
 * stretch the chart.
 */
export function histogram(
  sorted: Float64Array,
  width: number,
  tail = 0.005,
): Bucket[] {
  if (!sorted.length) return [];
  const first = Math.floor(quantile(sorted, tail) / width);
  const last = Math.floor(quantile(sorted, 1 - tail) / width);
  const counts = new Array<number>(last - first + 1).fill(0);
  for (const value of sorted) {
    const index = Math.min(
      Math.max(Math.floor(value / width), first),
      last,
    );
    counts[index - first]++;
  }
  return counts.map((count, i) => ({ from: (first + i) * width, count }));
}
