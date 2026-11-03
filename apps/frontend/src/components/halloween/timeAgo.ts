const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "always" });

/** "5 minutes ago", "2 days ago"; "just now" under a minute. */
export const timeAgo = (iso: string, now: Date): string => {
  const seconds = Math.max(0, (now.getTime() - Date.parse(iso)) / 1000);
  for (const [unit, size] of UNITS) {
    if (seconds >= size) {
      return relativeTime.format(-Math.floor(seconds / size), unit);
    }
  }
  return "just now";
};
