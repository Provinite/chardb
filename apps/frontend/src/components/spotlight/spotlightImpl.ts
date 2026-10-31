/**
 * Which page search is mounted: the `CommandPalette`, or Mantine's Spotlight
 * it replaced.
 *
 * Temporary. Both ship until Mantine is removed (#466), so the e2e specs can
 * hold the palette to everything the Spotlight did; they pick one through this
 * key. Goes with Mantine.
 */
export type SpotlightImpl = "mantine" | "palette";

const STORAGE_KEY = "chardb.spotlightImpl";

export function readSpotlightImpl(): SpotlightImpl {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "mantine"
      ? "mantine"
      : "palette";
  } catch {
    // Storage can be blocked outright; the default is the one in production.
    return "palette";
  }
}
