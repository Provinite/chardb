import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LEGACY_THEME_STORAGE_KEY, themeCookieName } from "../themePreference";

/**
 * Runs the theme script inlined at the top of `index.html`. It runs before any
 * module loads, so it cannot import `themePreference`; these tests hold the
 * two to the same answers.
 */
const ROOT = "boot.test";
const html = readFileSync(resolve(__dirname, "../../../index.html"), "utf8");
const source = html.match(/<script id="theme-boot">([\s\S]*?)<\/script>/)?.[1];

const runBootScript = () => {
  if (!source) throw new Error("theme-boot script not found in index.html");
  new Function(source.replace("%VITE_ROOT_DOMAIN%", ROOT))();
};

const setSystemDark = (dark: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: dark && query === "(prefers-color-scheme: dark)",
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

const setLegacy = (value: string | null) => {
  vi.mocked(window.localStorage.getItem).mockImplementation((key) =>
    key === LEGACY_THEME_STORAGE_KEY ? value : null,
  );
};

const name = themeCookieName(ROOT);

describe("index.html theme boot script", () => {
  beforeEach(() => {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
    setLegacy(null);
  });

  afterEach(() => {
    document.cookie = `${name}=; Max-Age=0`;
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
    document.head.querySelector('meta[name="theme-color"]')?.remove();
  });

  it("applies a dark cookie over a light system", () => {
    setSystemDark(false);
    document.cookie = `${name}=dark`;
    runBootScript();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(
      document.head
        .querySelector('meta[name="theme-color"]')
        ?.getAttribute("content"),
    ).toBe("#0f172a");
  });

  it("applies a light cookie over a dark system", () => {
    setSystemDark(true);
    document.cookie = `${name}=light`;
    runBootScript();
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("follows the system with no cookie or with system", () => {
    setSystemDark(true);
    runBootScript();
    expect(document.documentElement.dataset.theme).toBe("dark");

    setSystemDark(false);
    document.cookie = `${name}=system`;
    runBootScript();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("uses a choice saved under the old localStorage key until it is migrated", () => {
    setSystemDark(false);
    setLegacy("dark");
    runBootScript();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("takes the first of two same-named cookies, as parseThemePreference does", () => {
    setSystemDark(false);
    const cookie = Object.getOwnPropertyDescriptor(
      Document.prototype,
      "cookie",
    );
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => `${name}=dark; ${name}=light`,
    });
    try {
      runBootScript();
      expect(document.documentElement.dataset.theme).toBe("dark");
    } finally {
      delete (document as { cookie?: string }).cookie;
      if (cookie) Object.defineProperty(Document.prototype, "cookie", cookie);
    }
  });

  it("ignores a cookie for another root domain", () => {
    setSystemDark(false);
    document.cookie = `${themeCookieName("other.test")}=dark`;
    runBootScript();
    expect(document.documentElement.dataset.theme).toBe("light");
    document.cookie = `${themeCookieName("other.test")}=; Max-Age=0`;
  });
});
