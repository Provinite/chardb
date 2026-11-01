/**
 * The Halloween event's odds: whether a knock wins, and which prize a win
 * takes. Shared so the dashboard's simulators roll exactly as `/knock` does;
 * the randomness itself is the caller's.
 */

/** A roll in [0, 1) wins exactly `winRate` of the time. */
export function knockWins(roll: number, winRate: number): boolean {
  return roll < winRate;
}

/** A prize's share of the draw: each unit left counts its weight. */
export function prizeDrawWeight(prize: {
  currentStock: number;
  weight: number;
}): number {
  return Math.max(prize.currentStock, 0) * prize.weight;
}

/**
 * The element whose cumulative weight first passes `roll`, an integer in
 * [0, total weight). Weight 2 is picked twice as often as weight 1.
 */
export function pickWeighted<T>(
  items: readonly T[],
  weights: readonly number[],
  roll: number,
): T {
  if (items.length !== weights.length) {
    throw new Error("elements and weights must be the same length");
  }
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += weights[i];
    if (sum > roll) {
      return items[i];
    }
  }
  return items[items.length - 1];
}
