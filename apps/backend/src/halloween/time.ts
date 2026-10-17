import { DateTime } from "luxon";

/**
 * Every time the event reasons about -- the daily reset, the start and end
 * dates, what an embed prints -- is US Central. The bot hard-coded this and
 * the players are used to it.
 */
export const EVENT_TIMEZONE = "America/Chicago";

export enum EventStatus {
  NotStartedYet,
  Ongoing,
  Ended,
}

function inChicago(date: Date): DateTime {
  return DateTime.fromJSDate(date, { zone: EVENT_TIMEZONE }).setLocale("en-US");
}

/**
 * The most recent moment the daily allowance reset: today's `resetTime` hour
 * in Chicago if it has arrived, otherwise yesterday's.
 */
export function getLastReset(resetTime: number, now: Date): Date {
  const local = inChicago(now);
  const todaysReset = local.set({ hour: resetTime }).startOf("hour");
  return (
    resetTime > local.hour ? todaysReset.minus({ days: 1 }) : todaysReset
  ).toJSDate();
}

export function getEventStatus(
  { startDate, endDate }: { startDate: Date | null; endDate: Date | null },
  now: Date,
): EventStatus {
  if (!startDate || now < startDate) {
    return EventStatus.NotStartedYet;
  }
  if (endDate && now > endDate) {
    return EventStatus.Ended;
  }
  return EventStatus.Ongoing;
}

/** `2025-10-01 5:05 pm` -- the bot's moment format `YYYY-MM-DD h:mm a`. */
export function formatChicagoDate(date: Date): string {
  const local = inChicago(date);
  return `${local.toFormat("yyyy-MM-dd h:mm")} ${local.toFormat("a").toLowerCase()}`;
}

/** `2025-10-01 5:05 PM`, as `/settings list` prints it. */
export function formatChicagoDateUpper(date: Date): string {
  return formatChicagoDate(date).toUpperCase();
}

/** `6 AM US Central Time`. */
export function formatResetHour(resetTime: number, now: Date): string {
  return `${inChicago(now).set({ hour: resetTime }).toFormat("h a").toUpperCase()} US Central Time`;
}

/** `2025-10-17 6:00:00 AM`. */
export function formatLastReset(date: Date): string {
  return inChicago(date).toFormat("yyyy-MM-dd h:mm:ss a").toUpperCase();
}

/**
 * `10/1/2025, 5:00:00 AM`. The bot printed event dates with a bare
 * `Date#toLocaleString()`, which on Lambda meant en-US in UTC. Newer ICU puts
 * a narrow no-break space before the meridiem; the bot's Node did not.
 */
export function formatLegacyLocale(date: Date): string {
  return date
    .toLocaleString("en-US", { timeZone: "UTC" })
    .replace(/ /g, " ");
}
