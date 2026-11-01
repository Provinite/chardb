import { DateTime } from "luxon";
import { EVENT_TIMEZONE, EventStatus, getEventStatus } from "../halloween/time";
import { findAchievement, trickOrTreaterSlug } from "./achievement-catalog";

/** A community's Halloween event, as its guild's settings set it. */
export interface CommunityHalloweenEvent {
  communityId: string;
  startDate: Date | null;
  endDate: Date | null;
}

export interface EarnedAchievement {
  communityId: string;
  slug: string;
}

/**
 * What signing in at `now` earns a member of these communities: the
 * trick-or-treater achievement for each event that is on. The year is the
 * one the event started in, in US Central like everything else about it, and
 * a year with no achievement in the catalog earns nothing.
 */
export function signInAchievements(
  events: readonly CommunityHalloweenEvent[],
  now: Date,
): EarnedAchievement[] {
  return events.flatMap((event) => {
    if (
      !event.startDate ||
      getEventStatus(event, now) !== EventStatus.Ongoing
    ) {
      return [];
    }
    const year = DateTime.fromJSDate(event.startDate, {
      zone: EVENT_TIMEZONE,
    }).year;
    const slug = trickOrTreaterSlug(year);
    return findAchievement(slug)
      ? [{ communityId: event.communityId, slug }]
      : [];
  });
}
