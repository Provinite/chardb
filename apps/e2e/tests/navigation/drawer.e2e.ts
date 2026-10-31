import type { Page } from "@playwright/test";
import { presetTest, expect } from "../../src/fixtures.js";
import { apexUrl } from "../../src/config.js";

const test = presetTest("community-basic");

/**
 * Below `md` the navigation sidebar is a drawer opened from the header
 * (#486). Open, it is a modal dialog: focus moves in and stays in, and
 * Escape, the scrim and a link all close it.
 */
const PHONE = { width: 390, height: 844 };

const menuButton = (page: Page) =>
  page.getByRole("button", { name: "Open navigation" });
const drawer = (page: Page) => page.getByRole("dialog", { name: "Navigation" });

/** Whether the page can scroll sideways. */
const scrollsSideways = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );

test.describe("navigation drawer at phone width", () => {
  test.use({ persona: "member", viewport: PHONE });

  test("gives the page the full width, with navigation behind a menu button", async ({
    page,
    world,
  }) => {
    await page.goto(world.community.url);
    await expect(menuButton(page)).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Community navigation" }),
    ).toBeHidden();

    const main = await page.locator("main").boundingBox();
    expect(main?.width).toBeGreaterThan(PHONE.width - 1);
    expect(await scrollsSideways(page)).toBe(false);
  });

  test("opens as a dialog that keeps focus inside", async ({ page, world }) => {
    await page.goto(world.community.url);
    await menuButton(page).click();

    await expect(drawer(page)).toBeVisible();
    await expect(
      drawer(page).getByRole("button", { name: "Close navigation" }),
    ).toBeFocused();

    // Tab past every stop in the drawer, twice round. The rest of the page is
    // inert, so focus is in the drawer or, past its last stop, on the body:
    // the browser's own toolbar, as with a native modal dialog.
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const where = await drawer(page).evaluate((el) =>
        el.contains(document.activeElement)
          ? "drawer"
          : document.activeElement === document.body
            ? "browser"
            : "page",
      );
      expect(where).not.toBe("page");
    }
  });

  test("closes on Escape and gives focus back to the menu button", async ({
    page,
    world,
  }) => {
    await page.goto(world.community.url);
    await menuButton(page).click();
    await expect(drawer(page)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer(page)).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
  });

  test("closes on a tap outside it", async ({ page, world }) => {
    await page.goto(world.community.url);
    await menuButton(page).click();
    await expect(drawer(page)).toBeVisible();

    // The strip of scrim to the right of the drawer.
    await page.mouse.click(PHONE.width - 10, PHONE.height / 2);
    await expect(drawer(page)).toBeHidden();
  });

  test("closes when a link in it navigates", async ({ page, world }) => {
    await page.goto(world.community.url);
    await menuButton(page).click();
    await drawer(page).getByRole("link", { name: "Members" }).click();

    await expect(page).toHaveURL(`${world.community.url}/members`);
    await expect(drawer(page)).toBeHidden();
  });

  test("closes for a link to the page already open", async ({
    page,
    world,
  }) => {
    await page.goto(world.community.url);
    await menuButton(page).click();
    await drawer(page).getByRole("link", { name: "Overview" }).click();
    await expect(drawer(page)).toBeHidden();
  });

  test("stays open when Escape closes the page search opened from it", async ({
    page,
    world,
  }) => {
    await page.goto(world.community.url);
    await menuButton(page).click();
    await drawer(page).getByRole("button", { name: "Search pages" }).click();
    const search = page.getByPlaceholder(/search/i).last();
    await expect(search).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(search).toBeHidden();
    await expect(drawer(page)).toBeVisible();
  });

  test("works the same on the apex, with global navigation", async ({
    page,
  }) => {
    await page.goto(apexUrl("/dashboard"));
    await menuButton(page).click();
    await expect(
      drawer(page).getByRole("navigation", { name: "Global navigation" }),
    ).toBeVisible();
  });
});

test.describe("account menu", () => {
  test.use({ persona: "member" });

  test("opens My profile in a new tab on Ctrl-click, like any link", async ({
    page,
    context,
  }) => {
    await page.goto(apexUrl("/dashboard"));
    await page.getByRole("button", { name: /, account menu$/ }).click();
    const tab = context.waitForEvent("page");
    await page
      .getByRole("menuitem", { name: "My profile" })
      .click({ modifiers: ["ControlOrMeta"] });
    await expect(await tab).toHaveURL(/\/user\//);
    await expect(page).toHaveURL(apexUrl("/dashboard"));
  });
});

test.describe("header at the narrowest width", () => {
  for (const persona of ["member", "anon"] as const) {
    test.describe(persona, () => {
      test.use({ persona, viewport: { width: 320, height: 640 } });

      test("does not scroll sideways", async ({ page, world }) => {
        await page.goto(world.community.url);
        await expect(menuButton(page)).toBeVisible();
        expect(await scrollsSideways(page)).toBe(false);
      });
    });
  }
});

test.describe("navigation at desktop width", () => {
  test.use({ persona: "member" });

  test("sits beside the page, with no menu button", async ({ page, world }) => {
    await page.goto(world.community.url);
    await expect(
      page.getByRole("navigation", { name: "Community navigation" }),
    ).toBeVisible();
    await expect(menuButton(page)).toBeHidden();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
