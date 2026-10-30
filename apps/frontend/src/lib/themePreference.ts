import { ROOT_DOMAIN } from "./communityHost";

/**
 * The light/dark preference, kept in a cookie on the root domain.
 *
 * Not `localStorage`: that is per origin, and the apex and every community
 * subdomain are separate origins, so each kept its own answer and a theme
 * picked on the apex was lost on the first community page.
 *
 * The inline script at the top of `index.html` reads the same cookie before
 * the first paint and repeats `parseThemePreference` and `resolveThemeMode` in
 * plain JS, since it runs before any module loads. Keep the two in step;
 * `bootScript.test.ts` runs the inline copy against these.
 */

export type ThemeMode = "light" | "dark";
export type ThemePreference = ThemeMode | "system";

/** Where the preference lived before it moved to the cookie. */
export const LEGACY_THEME_STORAGE_KEY = "chardb-theme-mode";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Named per root domain, like the session cookie. Staging lives under the
 * production domain, so a production cookie is also sent to staging; distinct
 * names keep the two from overwriting each other.
 */
export const themeCookieName = (rootDomain: string): string =>
  `chardb_theme_${rootDomain.replace(/[^a-z0-9]+/gi, "_")}`;

const isPreference = (value: string): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system";

export const parseThemePreference = (
  cookies: string,
  name: string,
): ThemePreference | null => {
  for (const pair of cookies.split(";")) {
    const [key, value] = pair.trim().split("=");
    if (key === name && value !== undefined && isPreference(value)) {
      return value;
    }
  }
  return null;
};

export const themeCookieString = (
  preference: ThemePreference,
  rootDomain: string,
): string =>
  `${themeCookieName(rootDomain)}=${preference}; Domain=${rootDomain}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;

export const resolveThemeMode = (
  preference: ThemePreference | null,
  systemPrefersDark: boolean,
): ThemeMode =>
  preference === "light" || preference === "dark"
    ? preference
    : systemPrefersDark
      ? "dark"
      : "light";

export const readThemePreference = (): ThemePreference | null =>
  parseThemePreference(document.cookie, themeCookieName(ROOT_DOMAIN));

export const writeThemePreference = (preference: ThemePreference): void => {
  document.cookie = themeCookieString(preference, ROOT_DOMAIN);
};

/**
 * `localStorage`, or null where site data is blocked: there, even reading the
 * `localStorage` property throws.
 */
export const siteStorage = (
  win: { readonly localStorage: Storage } = window,
): Storage | null => {
  try {
    return win.localStorage;
  } catch {
    return null;
  }
};

/**
 * A light/dark choice saved under the old `localStorage` key on this origin.
 * Null when there is none, or when storage access throws (site data blocked).
 */
export const readLegacyPreference = (
  storage: Pick<Storage, "getItem"> | null,
): ThemeMode | null => {
  if (storage === null) return null;
  try {
    const legacy = storage.getItem(LEGACY_THEME_STORAGE_KEY);
    return legacy === "light" || legacy === "dark" ? legacy : null;
  } catch {
    return null;
  }
};

const clearLegacyPreference = (storage: Pick<Storage, "removeItem"> | null) => {
  if (storage === null) return;
  try {
    storage.removeItem(LEGACY_THEME_STORAGE_KEY);
  } catch {
    // Storage blocked: nothing was readable there either.
  }
};

/**
 * Settles the old `localStorage` value on this origin against the cookie. With
 * a cookie, the cookie wins and the old value is cleared. Without one, an old
 * light/dark choice is written to the cookie and then cleared. Returns the
 * preference now in effect.
 */
export const migrateLegacyPreference = (
  current: ThemePreference | null,
  storage: Pick<Storage, "getItem" | "removeItem"> | null,
  write: (preference: ThemePreference) => void,
): ThemePreference | null => {
  if (current !== null) {
    clearLegacyPreference(storage);
    return current;
  }
  const legacy = readLegacyPreference(storage);
  if (legacy === null) return null;
  write(legacy);
  clearLegacyPreference(storage);
  return legacy;
};
