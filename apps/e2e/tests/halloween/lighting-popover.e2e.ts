import type { Page } from "@playwright/test";
import { presetTest, expect } from "../../src/fixtures.js";

const test = presetTest("candy-board");

/**
 * The candy board's Lighting control: a button that opens a panel of light
 * settings beside it.
 */
const trigger = (page: Page) => page.getByRole("button", { name: "Lighting" });
const panel = (page: Page) => page.getByRole("dialog", { name: "Lighting" });
const firstControl = (page: Page) =>
  panel(page).getByRole("button", { name: "How to move the light" });

test.describe("the Lighting panel", () => {
  test.use({ persona: "player" });

  test.beforeEach(async ({ page, world }) => {
    await page.goto(world.board.url);
    await expect(trigger(page)).toBeVisible();
  });

  test("opens from its button, which says it is open", async ({ page }) => {
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");

    await trigger(page).click();

    await expect(panel(page)).toBeVisible();
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
    await expect(
      panel(page).getByRole("slider", { name: "Light intensity" }),
    ).toBeVisible();
  });

  test("its button closes it again", async ({ page }) => {
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();

    await trigger(page).click();

    await expect(panel(page)).toBeHidden();
  });

  test("Escape closes it", async ({ page }) => {
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(panel(page)).toBeHidden();
  });

  test("a click elsewhere closes it", async ({ page }) => {
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();

    await page.getByRole("heading", { level: 1 }).click();

    await expect(panel(page)).toBeHidden();
  });

  test("stays open while it is used", async ({ page }) => {
    await trigger(page).click();

    await panel(page)
      .getByRole("slider", { name: "Light intensity" })
      .fill("0.5");

    await expect(panel(page)).toBeVisible();
  });

  test("sits on screen at phone width", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await trigger(page).click();

    const box = await panel(page).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  });

  test("keyboard: focus moves into the panel, and Escape hands it back", async ({
    page,
  }) => {
    await trigger(page).focus();
    await page.keyboard.press("Enter");

    // Its first control: the note on how to move the light.
    await expect(firstControl(page)).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(panel(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });

  test("keyboard: Shift+Tab from the panel goes back to its button", async ({
    page,
  }) => {
    await trigger(page).focus();
    await page.keyboard.press("Enter");
    await expect(firstControl(page)).toBeFocused();

    await page.keyboard.press("Shift+Tab");

    await expect(trigger(page)).toBeFocused();
  });

  test("keyboard: Tab past the panel closes it and carries on along the page", async ({
    page,
  }) => {
    const next = page.getByRole("button", { name: "Background" });
    await trigger(page).focus();
    await page.keyboard.press("Enter");
    const cone = panel(page).getByRole("slider", { name: "Spotlight cone" });
    // The cone is off until there is a spotlight, so the last control that
    // takes focus is the spotlight slider.
    await panel(page)
      .getByRole("slider", { name: "Spotlight", exact: true })
      .focus();

    await page.keyboard.press("Tab");

    await expect(cone).toBeHidden();
    await expect(next).toBeFocused();
  });
});
