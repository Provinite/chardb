import type { BrowserContext, Page } from "@playwright/test";
import { presetTest, expect } from "../../src/fixtures.js";
import { CFG, apexUrl } from "../../src/config.js";

const test = presetTest("community-basic");

/**
 * The theme is applied, and the startup screen shown, before the app's
 * JavaScript runs (#470). Blocking the bundle freezes the page in exactly the
 * state a visitor sees while it downloads, so these checks do not depend on
 * catching a frame in time.
 */

const DARK = "rgb(15, 23, 42)";
const LIGHT = "rgb(255, 255, 255)";

const themeCookieName = `chardb_theme_${CFG.rootDomain.replace(/[^a-z0-9]+/gi, "_")}`;

const setThemeCookie = (context: BrowserContext, value: string) =>
  context.addCookies([
    { name: themeCookieName, value, domain: CFG.rootDomain, path: "/" },
  ]);

const blockAppCode = (page: Page) =>
  page.route(/\.(js|tsx)(\?.*)?$/, (route) => route.abort());

const htmlBackground = (page: Page) =>
  page.evaluate(
    () => getComputedStyle(document.documentElement).backgroundColor,
  );

test.describe("before the app's code has loaded", () => {
  test("a dark choice wins over a light system", async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await setThemeCookie(context, "dark");
    await blockAppCode(page);
    await page.goto(apexUrl("/"), { waitUntil: "domcontentloaded" });

    expect(await htmlBackground(page)).toBe(DARK);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("with no choice, a dark system is followed", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await blockAppCode(page);
    await page.goto(apexUrl("/"), { waitUntil: "domcontentloaded" });

    expect(await htmlBackground(page)).toBe(DARK);
  });

  test("a light choice wins over a dark system", async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await setThemeCookie(context, "light");
    await blockAppCode(page);
    await page.goto(apexUrl("/"), { waitUntil: "domcontentloaded" });

    expect(await htmlBackground(page)).toBe(LIGHT);
  });

  test("shows the startup screen", async ({ page }) => {
    await blockAppCode(page);
    await page.goto(apexUrl("/"), { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("status")).toHaveText(/Loading/);
    await expect(page.locator("#boot-screen")).toBeVisible();
  });
});

test.describe("once the app has loaded", () => {
  test("the startup screen is gone", async ({ page }) => {
    await page.goto(apexUrl("/"));
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.locator("#boot-screen")).toHaveCount(0);
  });

  test("a theme chosen on the apex carries to a community", async ({
    page,
    world,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(apexUrl("/"));
    await page.getByRole("button", { name: "Switch to dark mode" }).click();

    await blockAppCode(page);
    await page.goto(world.community.url, { waitUntil: "domcontentloaded" });
    expect(await htmlBackground(page)).toBe(DARK);
  });

  test("a theme chosen on a community carries back to the apex", async ({
    page,
    world,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(world.community.url);
    await page.getByRole("button", { name: "Switch to dark mode" }).click();

    await blockAppCode(page);
    await page.goto(apexUrl("/"), { waitUntil: "domcontentloaded" });
    expect(await htmlBackground(page)).toBe(DARK);
  });
});
