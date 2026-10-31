import type { Page } from "@playwright/test";
import { presetTest, expect } from "../../src/fixtures.js";
import { apexUrl } from "../../src/config.js";

const test = presetTest("community-basic");

/**
 * Each page's code is its own chunk, loaded when the page is (#465). The
 * suite serves the production build, so chunk filenames here are the real
 * ones: `<name>-<hash>.js`, named after the page module or, for pages loaded
 * together, after their barrel in `routes/chunks/`.
 */

const GROUPED = ["siteAdmin", "communityAdmin", "speciesAdmin"];

const chunkName = (url: string) =>
  new URL(url).pathname.match(/\/assets\/([A-Za-z]+)-[\w-]+\.js$/)?.[1];

const isPageChunk = (name: string) =>
  /Page$/.test(name) ||
  name === "CommunityUnreachable" ||
  GROUPED.includes(name);

/** Every page chunk the page fetches from now on, by name. */
const recordPageChunks = (page: Page) => {
  const names = new Set<string>();
  page.on("response", (response) => {
    const name = chunkName(response.url());
    if (name && isPageChunk(name)) names.add(name);
  });
  return names;
};

test.describe("a cold load fetches only its own page's code", () => {
  test("the apex home", async ({ page }) => {
    const chunks = recordPageChunks(page);
    await page.goto(apexUrl("/"), { waitUntil: "networkidle" });
    expect([...chunks]).toEqual(["HomePage"]);
  });

  test("a character", async ({ page, world }) => {
    const chunks = recordPageChunks(page);
    await page.goto(world.characters.plain.url, { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: world.characters.plain.name }),
    ).toBeVisible();
    expect([...chunks]).toEqual(["CharacterPage"]);
  });

  test("a community", async ({ page, world }) => {
    const chunks = recordPageChunks(page);
    await page.goto(world.community.url, { waitUntil: "networkidle" });
    expect([...chunks]).toEqual(["CommunityPage"]);
  });
});

test.describe("navigating to a page whose code is still loading", () => {
  test("keeps the current page up, with the progress bar, until the next is ready", async ({
    page,
  }) => {
    await page.goto(apexUrl("/"));
    await expect(page.locator("#boot-screen")).toHaveCount(0);

    // Hold the next page's chunk well past the progress bar's 500ms delay.
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route(/\/assets\/CharactersPage-[\w-]+\.js$/, async (route) => {
      await held;
      await route.continue();
    });

    // Flags any moment the page area is left with nothing in it.
    await page.evaluate(() => {
      const main = document.querySelector("main") as HTMLElement;
      const w = window as unknown as { mainEmptied: boolean };
      w.mainEmptied = false;
      new MutationObserver(() => {
        if (main.childElementCount === 0) w.mainEmptied = true;
      }).observe(main, { childList: true });
    });

    await page.getByRole("link", { name: "All Characters" }).click();

    await expect(
      page.getByRole("progressbar", { name: "Loading page" }),
    ).toBeVisible();
    // The address moves at once; the page it names has not rendered yet.
    await expect(page).toHaveURL(apexUrl("/characters"));

    release();

    await expect(
      page.getByRole("progressbar", { name: "Loading page" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => (window as unknown as { mainEmptied: boolean }).mainEmptied,
      ),
    ).toBe(false);
  });
});
