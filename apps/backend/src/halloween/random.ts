import { Injectable } from "@nestjs/common";
import { randomInt } from "crypto";

/**
 * crypto.randomInt requires max - min < 2^48, and both must be safe integers.
 */
const MAX = Math.min(Math.pow(2, 48) - 1, Number.MAX_SAFE_INTEGER);

/**
 * Number names for `/prize list`. For the nth key `k_n`, the value names
 * numbers in `(k_(n-1), k_n]`.
 */
const VAGUE_NUMBER_NAMES: Record<string, readonly string[]> = {
  1: ["just one"],
  5: ["a few", "several", "a couple", "not too many"],
  10: ["a bunch", "a bundle", "an armload", "many"],
  20: ["bunches", "gobs", "oodles", "bundles", "heaps"],
  999999: [
    "tons",
    "too many to count",
    "an absolute blanket fortload",
    "a truckload",
  ],
};

/**
 * Every random draw the event makes, behind one provider so tests can script
 * the dice. `unit` and `int` are the only sources; everything else is built on
 * them.
 */
@Injectable()
export class HalloweenRandom {
  /** A cryptographically secure number in [0, 1). */
  unit(): number {
    return randomInt(0, MAX) / MAX;
  }

  /** A cryptographically secure integer in [0, max). */
  int(max: number): number {
    return randomInt(max);
  }

  element<T>(items: readonly T[]): T {
    return items[Math.floor(this.unit() * items.length)];
  }

  /**
   * An element chosen with probability proportional to its weight: weight 2
   * is twice as likely as weight 1.
   */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    if (items.length !== weights.length) {
      throw new Error("elements and weights must be the same length");
    }
    const total = weights.reduce((acc, w) => acc + w, 0);
    const roll = this.int(total);
    let sum = 0;
    for (let i = 0; i < items.length; i++) {
      sum += weights[i];
      if (sum > roll) {
        return items[i];
      }
    }
    return items[items.length - 1];
  }

  shuffle<T>(items: readonly T[]): T[] {
    return [...items].sort(() => this.unit() - 0.5);
  }

  /**
   * A vague name for a stock count, like "an armload" or "heaps".
   *
   * The keys are deliberately iterated in string order, as the bot did:
   * "1", "10", "20", "5", "999999". That makes the "a few" bucket unreachable
   * and puts 2-10 under "10". Kept so `/prize list` reads as it always has.
   */
  vagueNumberName(n: number): string {
    for (const key of Object.keys(VAGUE_NUMBER_NAMES).sort()) {
      if (n <= Number(key)) {
        return this.element(VAGUE_NUMBER_NAMES[key]);
      }
    }
    return "an absolutely huge number";
  }
}
