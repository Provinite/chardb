import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LEGACY_THEME_STORAGE_KEY,
  migrateLegacyPreference,
  parseThemePreference,
  resolveThemeMode,
  themeCookieName,
  themeCookieString,
} from "../themePreference";

describe("themeCookieName", () => {
  it("names the cookie after the root domain, as the session cookie is", () => {
    expect(themeCookieName("chardb.cc")).toBe("chardb_theme_chardb_cc");
    expect(themeCookieName("dev.chardb.cc")).toBe("chardb_theme_dev_chardb_cc");
  });
});

describe("parseThemePreference", () => {
  const name = themeCookieName("chardb.cc");

  it("reads light, dark and system", () => {
    expect(parseThemePreference(`${name}=dark`, name)).toBe("dark");
    expect(parseThemePreference(`a=1; ${name}=light; b=2`, name)).toBe("light");
    expect(parseThemePreference(`${name}=system`, name)).toBe("system");
  });

  it("ignores a missing cookie, an unknown value and a similar name", () => {
    expect(parseThemePreference("", name)).toBeNull();
    expect(parseThemePreference(`${name}=purple`, name)).toBeNull();
    expect(parseThemePreference(`x${name}=dark`, name)).toBeNull();
  });
});

describe("themeCookieString", () => {
  it("scopes the cookie to the root domain so every subdomain shares it", () => {
    const cookie = themeCookieString("dark", "chardb.cc");
    expect(cookie).toContain("chardb_theme_chardb_cc=dark");
    expect(cookie).toContain("Domain=chardb.cc");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toMatch(/Max-Age=\d{8}/);
  });
});

describe("resolveThemeMode", () => {
  it("uses an explicit choice whatever the system says", () => {
    expect(resolveThemeMode("dark", false)).toBe("dark");
    expect(resolveThemeMode("light", true)).toBe("light");
  });

  it("follows the system for system and for no choice", () => {
    expect(resolveThemeMode("system", true)).toBe("dark");
    expect(resolveThemeMode(null, false)).toBe("light");
  });
});

describe("migrateLegacyPreference", () => {
  afterEach(() => vi.restoreAllMocks());

  const storage = (value: string | null) => ({
    getItem: vi.fn(() => value),
    removeItem: vi.fn(),
  });

  it("copies a stored light or dark into the cookie once and forgets it", () => {
    const store = storage("dark");
    const write = vi.fn();
    expect(migrateLegacyPreference(null, store, write)).toBe("dark");
    expect(write).toHaveBeenCalledWith("dark");
    expect(store.removeItem).toHaveBeenCalledWith(LEGACY_THEME_STORAGE_KEY);
  });

  it("leaves an existing cookie alone", () => {
    const store = storage("dark");
    const write = vi.fn();
    expect(migrateLegacyPreference("light", store, write)).toBe("light");
    expect(write).not.toHaveBeenCalled();
  });

  it("does nothing when nothing was stored", () => {
    const store = storage(null);
    const write = vi.fn();
    expect(migrateLegacyPreference(null, store, write)).toBeNull();
    expect(write).not.toHaveBeenCalled();
  });
});
