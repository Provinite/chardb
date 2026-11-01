import type { Locator } from "@playwright/test";
import { presetTest, expect } from "../../src/fixtures.js";
import { apexUrl } from "../../src/config.js";

const test = presetTest("community-basic");

/**
 * The shared Button, ButtonLink and IconButton (#503): link buttons stay real
 * links, every size is a 44px target to a finger, and a busy button blocks
 * the press that Enter in a form field makes.
 */
const PHONE = { width: 390, height: 844 };

/** Half of the 44px a touch target spans, less a pixel for rounding. */
const REACH = 21;

/**
 * Whether a tap `REACH` pixels from the centre, in each direction, lands on
 * the control. Its hit area may be a pseudo-element, which hit-testing
 * reports as the element itself, so this measures what a finger gets.
 */
const reachesEveryWay = (control: Locator) =>
  control.evaluate((el, reach) => {
    const box = el.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    return [
      [x - reach, y],
      [x + reach, y],
      [x, y - reach],
      [x, y + reach],
    ].map(([px, py]) => {
      const hit = document.elementFromPoint(px, py);
      return hit !== null && (hit === el || el.contains(hit));
    });
  }, REACH);

test.describe("link buttons", () => {
  test.use({ persona: "anon" });

  test("open in a new tab on Ctrl-click, leaving the page where it was", async ({
    page,
    context,
  }) => {
    const missing = apexUrl("/no-such-page");
    await page.goto(missing);
    const home = page.getByRole("link", { name: "Go Home" });
    await expect(home).toHaveAttribute("href", "/");

    const opened = context.waitForEvent("page");
    await home.click({ modifiers: ["ControlOrMeta"] });
    const tab = await opened;

    await expect(tab).toHaveURL(apexUrl("/"));
    expect(page.url()).toBe(missing);
  });
});

test.describe("touch targets on a phone", () => {
  test.use({
    persona: "member",
    viewport: PHONE,
    hasTouch: true,
    isMobile: true,
  });

  test("an md icon button is a 44px square", async ({ page }) => {
    await page.goto(apexUrl("/dashboard"));
    const menu = page.getByRole("button", { name: "Open navigation" });
    const box = await menu.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test("an md button is at least 44px each way", async ({ page }) => {
    await page.goto(apexUrl("/dashboard"));
    const box = await page
      .getByRole("link", { name: "Join Community" })
      .boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test("an sm button takes a tap 22px from its centre in every direction", async ({
    page,
  }) => {
    await page.goto(apexUrl("/dashboard"));
    const small = page.getByRole("link", { name: "View Characters" });
    const box = await small.boundingBox();
    // Smaller than a finger to look at; the hit area is what reaches.
    expect(box?.height).toBeLessThan(44);
    // Hit-testing only sees what is in the viewport.
    await small.scrollIntoViewIfNeeded();
    expect(await reachesEveryWay(small)).toEqual([true, true, true, true]);
  });
});

test.describe("a busy submit button", () => {
  test.use({ persona: "anon" });

  test("ignores Enter in the form while the first submit is running", async ({
    page,
    world,
  }) => {
    let logins = 0;
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/graphql", async (route) => {
      if (route.request().postData()?.includes('"operationName":"Login"')) {
        logins++;
        await held;
      }
      await route.continue();
    });

    await page.goto(apexUrl("/login"));
    await page.getByLabel("Email").fill(world.users.member.email);
    const password = page.getByLabel("Password");
    await password.fill(world.users.member.password);
    await password.press("Enter");
    // Found by type: the login page still swaps its label while signing in.
    const submit = page.locator('main form button[type="submit"]');
    await expect(submit).toHaveAttribute("aria-disabled", "true");
    await expect(submit).not.toHaveAttribute("disabled");

    await password.press("Enter");
    await password.press("Enter");
    release();

    await expect(page).toHaveURL(apexUrl("/dashboard"));
    expect(logins).toBe(1);
  });
});
