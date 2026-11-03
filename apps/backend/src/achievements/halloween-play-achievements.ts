import { DateTime } from "luxon";
import { EVENT_TIMEZONE, getLastReset } from "../halloween/time";
import {
  CANDY_TRADE_TIERS,
  findAchievement,
  halloweenPlaySlug,
} from "./achievement-catalog";

/** What a player did during one year's Trick-or-Treat, in one guild. */
export interface HalloweenPlay {
  /** Candy swaps completed, on either side. */
  trades: number;
  /** Placed an offer of 3 candies for 1. */
  offeredThreeForOne: boolean;
  /** Accepted someone else's offer of 3 candies for 1. */
  tookThreeForOne: boolean;
  giftedSelf: boolean;
  /** Sent a gifty to the Trick-or-Treat bot itself. */
  giftedBot: boolean;
  knockedEveryDay: boolean;
  /** Tried to knock with no knocks or gifties left. */
  knockedWithNoneLeft: boolean;
}

/**
 * What this play earns, for the event of `year`. Every trade tier reached is
 * earned, not only the highest. A year with no achievements in the catalog
 * earns nothing.
 */
export function halloweenPlaySlugs(
  play: HalloweenPlay,
  year: number,
): string[] {
  const slug = halloweenPlaySlug(year);
  const earned = [
    ...CANDY_TRADE_TIERS.filter((tier) => play.trades >= tier).map(
      slug.candyTrades,
    ),
    ...(play.offeredThreeForOne ? [slug.generousOffer] : []),
    ...(play.tookThreeForOne ? [slug.bargainHunter] : []),
    ...(play.giftedSelf ? [slug.treatYourself] : []),
    ...(play.giftedBot ? [slug.faustianBargain] : []),
    ...(play.knockedEveryDay ? [slug.everyNight] : []),
    ...(play.knockedWithNoneLeft ? [slug.nobodyHome] : []),
  ];
  return earned.filter((s) => findAchievement(s));
}

export interface HalloweenEventDays {
  startDate: Date;
  endDate: Date | null;
  /** Hour of the day, US Central, the allowance resets at. */
  resetTime: number;
}

/**
 * Whether every reset day the event touches has one of these knocks: from
 * the day the event starts in to the day it ends in. An event with no end
 * has no last day, so it is never knocked every day of.
 */
export function knockedEveryDay(
  knocks: readonly Date[],
  { startDate, endDate, resetTime }: HalloweenEventDays,
): boolean {
  if (!endDate) return false;
  const knocked = new Set(knocks.map((k) => resetDay(resetTime, k)));
  // An event ending exactly at a reset has no time in the day that starts.
  const last = resetDay(resetTime, new Date(endDate.getTime() - 1));
  for (
    let day = DateTime.fromISO(resetDay(resetTime, startDate), {
      zone: EVENT_TIMEZONE,
    });
    day.toISODate()! <= last;
    day = day.plus({ days: 1 })
  ) {
    if (!knocked.has(day.toISODate()!)) return false;
  }
  return true;
}

/**
 * The US Central date of the reset a moment falls after, e.g. `2026-11-01`.
 * A date rather than an instant: when daylight saving ends, an early reset
 * hour happens twice, and both are the same day.
 */
function resetDay(resetTime: number, at: Date): string {
  return DateTime.fromJSDate(getLastReset(resetTime, at), {
    zone: EVENT_TIMEZONE,
  }).toISODate()!;
}
