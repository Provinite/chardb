import { Injectable } from "@nestjs/common";
import { randomInt } from "crypto";
import { pickWeighted } from "@chardb/shared";

/**
 * crypto.randomInt requires max - min < 2^48, and both must be safe integers.
 */
const MAX = Math.min(Math.pow(2, 48) - 1, Number.MAX_SAFE_INTEGER);

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
    const total = weights.reduce((acc, w) => acc + w, 0);
    return pickWeighted(items, weights, this.int(total));
  }

  shuffle<T>(items: readonly T[]): T[] {
    return [...items].sort(() => this.unit() - 0.5);
  }
}
