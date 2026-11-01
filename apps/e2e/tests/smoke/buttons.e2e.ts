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

/** Whether a control is at least 44px each way, the size a finger needs. */
const expectFingerSized = async (control: Locator) => {
  const box = await control.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
};

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
    await expectFingerSized(
      page.getByRole("button", { name: "Open navigation" }),
    );
  });

  test("an md button is at least 44px each way", async ({ page }) => {
    await page.goto(apexUrl("/dashboard"));
    await expectFingerSized(page.getByRole("link", { name: "Join Community" }));
  });

  test("an sm button grows to 44px each way", async ({ page }) => {
    await page.goto(apexUrl("/dashboard"));
    await expectFingerSized(
      page.getByRole("link", { name: "View Characters" }),
    );
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
