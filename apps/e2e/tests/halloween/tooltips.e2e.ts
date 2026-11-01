import type { Page } from "@playwright/test";
import { presetTest, expect } from "../../src/fixtures.js";

const test = presetTest("candy-board");

/**
 * Tooltips that name icon buttons, and the toggletip that explains the
 * lighting pad. Tooltips are visual only -- the button already carries its
 * name -- so they are found by their text, not a role.
 */
const copyButton = (page: Page) =>
  page.getByRole("button", { name: /^Copy link to/ });
const copyTip = (page: Page) => page.getByText("Copy link", { exact: true });

test.describe("a naming tooltip", () => {
  test.use({ persona: "player" });

  test.beforeEach(async ({ page, world }) => {
    await page.goto(`${world.community.url}/halloween/board`);
    await expect(copyButton(page)).toBeVisible();
  });

  test("shows on hover", async ({ page }) => {
    await copyButton(page).hover();

    await expect(copyTip(page)).toBeVisible();
  });

  test("hides when the pointer leaves", async ({ page }) => {
    await copyButton(page).hover();
    await expect(copyTip(page)).toBeVisible();

    await page.mouse.move(0, 0);

    await expect(copyTip(page)).toBeHidden();
  });

  test("shows on keyboard focus", async ({ page }) => {
    await copyButton(page).focus();
    // Focus from the keyboard, so :focus-visible applies.
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");

    await expect(copyButton(page)).toBeFocused();
    await expect(copyTip(page)).toBeVisible();
  });

  test("hides on Escape", async ({ page }) => {
    await copyButton(page).hover();
    await expect(copyTip(page)).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(copyTip(page)).toBeHidden();
  });

  test("stays while the pointer moves onto it", async ({ page }) => {
    await copyButton(page).hover();
    await expect(copyTip(page)).toBeVisible();

    await copyTip(page).hover();

    await expect(copyTip(page)).toBeVisible();
  });
});

test.describe("the lighting pad's toggletip", () => {
  test.use({ persona: "player" });

  test("explains the pad on a click, and closes on Escape", async ({
    page,
    world,
  }) => {
    await page.goto(world.board.url);
    await page.getByRole("button", { name: "Lighting" }).click();
    const info = page.getByRole("button", { name: "How to move the light" });

    const hint = "Drag the light, or use the arrow keys";
    // What is seen, and what screen readers are told: the same words, in a
    // bubble beside the button and in a live region announced on opening.
    const bubble = page.locator("[data-toggletip-bubble]");
    const announced = page
      .getByRole("dialog", { name: "Lighting" })
      .getByRole("status");

    await info.click();

    await expect(bubble).toHaveText(hint);
    await expect(announced).toHaveText(hint);

    await page.keyboard.press("Escape");

    await expect(bubble).toBeHidden();
    await expect(announced).toHaveText("");
    // The panel it sits in stays open: that Escape was the toggletip's.
    await expect(page.getByRole("dialog", { name: "Lighting" })).toBeVisible();
  });
});
