import { presetTest, expect } from "../../src/fixtures.js";

const test = presetTest("community-basic");

/**
 * Picking a character's image on the create form (#406).
 *
 * The image is held until the character exists, then uploaded to it and made
 * its main image. Two requests after the create, so the failure path matters
 * as much as the happy one: the character must survive a failed upload, and
 * the member must be told where to try again.
 */
test.describe("creating a character with an image", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  // A one-pixel PNG; see tests/images/upload.e2e.ts.
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  test("the picked image becomes the new character's main image", async ({
    page,
    world,
  }) => {
    await page.goto(`${world.community.url}/character/create`);

    await page
      .getByTestId("character-image-picker")
      .locator('input[type="file"]')
      .setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: PNG });
    await expect(
      page.getByTestId("character-image-picker").getByRole("img"),
    ).toBeVisible();

    await page.locator("#name").fill("Pictured");
    await page.getByText(world.species.name, { exact: true }).first().click();
    await page.getByTestId("submit-character").click();

    await expect(page).toHaveURL(/\/character\/[0-9a-f-]+$/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("img", { name: "Pictured main image" }),
    ).toBeVisible();
  });

  test("a failed upload keeps the character and says where to retry", async ({
    page,
    world,
  }) => {
    await page.route("**/images/upload", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Storage unavailable" }),
      }),
    );

    await page.goto(`${world.community.url}/character/create`);
    await page
      .getByTestId("character-image-picker")
      .locator('input[type="file"]')
      .setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: PNG });

    await page.locator("#name").fill("Unpictured");
    await page.getByText(world.species.name, { exact: true }).first().click();
    await page.getByTestId("submit-character").click();

    await expect(page).toHaveURL(/\/character\/([0-9a-f-]+)$/, {
      timeout: 30_000,
    });
    const characterId = page.url().split("/").pop();

    await expect(page.getByText(/image could not be attached/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /upload it again/i }),
    ).toHaveAttribute("href", `/image/upload?character=${characterId}`);
    await expect(
      page.getByRole("heading", { name: "Unpictured" }),
    ).toBeVisible();
  });
});
