import { presetTest, expect } from "../../src/fixtures.js";
import { CFG } from "../../src/config.js";
import { withClient } from "../../src/db/sql.js";

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

  // A solid 200x100 PNG, so a square crop is a real choice; the same bytes as
  // tests/images/thumbnail-crop.e2e.ts.
  const WIDE_PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAIAAABM5OhcAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAzUlEQVR42u3SMQ0AAAgEsZeDCPwHWZhgYGhSBZfLVMO5SICxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsMBbGwlhgLIyFscBYGAtjgbEwFsYCY2EsjAXGwlgYC4yFsTAWGAtjYSwwFsbCWGAsjIWxwFgYC2OBsTAWxgJjYSyMBcbCWBgLjIWxMBYYC2NhLDAWxsJYYCyMhbHAWBgLY4GxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsjKUCxsJYGAuMhbEwFhgLY2EsMBa/x1one5LWE0ewPwAAAABJRU5ErkJggg==",
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
      page
        .getByTestId("character-image-picker")
        .getByRole("img", { name: "pixel.png" }),
    ).toBeVisible();

    await page.locator("#name").fill("Pictured");
    await page.getByText(world.species.name, { exact: true }).first().click();
    await page.getByTestId("submit-character").click();

    // Each step ticks off in the progress dialog (#424), which then offers
    // the character rather than taking anyone there.
    const progress = page.getByTestId("create-progress-dialog");
    await expect(progress).toContainText("Pictured is ready", {
      timeout: 30_000,
    });
    await expect(progress.getByRole("listitem")).toHaveCount(3);
    for (const step of await progress.getByRole("listitem").all()) {
      await expect(step).toHaveAttribute("data-status", "done");
    }

    await progress.getByRole("link", { name: "View character" }).click();
    await expect(page).toHaveURL(/\/character\/[0-9a-f-]+$/);
    await expect(
      page.getByRole("img", { name: "Pictured main image" }),
    ).toBeVisible();
  });

  test("the thumbnail framed on the form is the one stored (#418)", async ({
    page,
    world,
  }) => {
    await page.goto(`${world.community.url}/character/create`);

    const picker = page.getByTestId("character-image-picker");
    await picker.locator('input[type="file"]').setInputFiles({
      name: "wide.png",
      mimeType: "image/png",
      buffer: WIDE_PNG,
    });
    await expect(
      picker.getByText("Thumbnail: centre of the image"),
    ).toBeVisible();

    // Zooming moves the rect by a definite amount through a stable control;
    // see tests/images/thumbnail-crop.e2e.ts.
    await picker.getByRole("button", { name: "Choose crop" }).click();
    await page.locator("#thumbnail-crop-zoom").fill("2");
    await page.getByRole("button", { name: "Use this crop" }).click();
    await expect(picker.getByText("Thumbnail: your crop")).toBeVisible();

    await page.locator("#name").fill("Framed");
    await page.getByText(world.species.name, { exact: true }).first().click();
    await page.getByTestId("submit-character").click();
    await expect(page.getByTestId("create-progress-dialog")).toContainText(
      "is ready",
      { timeout: 30_000 },
    );

    const row = await withClient(CFG.databaseUrl, async (client) => {
      const { rows } = await client.query<{
        thumbnail_crop_x: number | null;
        thumbnail_crop_y: number | null;
        thumbnail_crop_width: number | null;
        thumbnail_crop_height: number | null;
      }>(
        `SELECT i.thumbnail_crop_x, i.thumbnail_crop_y,
                i.thumbnail_crop_width, i.thumbnail_crop_height
           FROM characters c
           JOIN media m ON m.id = c.main_media_id
           JOIN images i ON i.id = m.image_id
          WHERE c.name = $1`,
        ["Framed"],
      );
      expect(rows).toHaveLength(1);
      return rows[0];
    });

    // A square inside the 200x100 image, tighter than its height: what
    // zooming past 1 has to mean.
    expect(row.thumbnail_crop_width).toBe(row.thumbnail_crop_height);
    expect(row.thumbnail_crop_width!).toBeGreaterThan(0);
    expect(row.thumbnail_crop_width!).toBeLessThan(100);
    expect(
      row.thumbnail_crop_x! + row.thumbnail_crop_width!,
    ).toBeLessThanOrEqual(200);
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

    const progress = page.getByTestId("create-progress-dialog");
    await expect(progress).toContainText("Unpictured was created", {
      timeout: 30_000,
    });
    await expect(progress).toContainText("couldn't be uploaded");

    const goTo = progress.getByRole("link", { name: "Go to character" });
    const characterId = (await goTo.getAttribute("href"))!.split("/").pop();
    await expect(
      progress.getByRole("link", { name: "Upload again" }),
    ).toHaveAttribute("href", `/image/upload?character=${characterId}`);

    await goTo.click();
    await expect(
      page.getByRole("heading", { name: "Unpictured" }),
    ).toBeVisible();
  });

  test("a failed set-as-main points at the uploaded image, not a re-upload", async ({
    page,
    world,
  }) => {
    // The upload lands; only making it the main image fails. Telling the
    // member to upload again would leave a second copy (#424).
    await page.route("**/graphql", async (route) => {
      if (route.request().postData()?.includes("SetCharacterMainMedia")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: null,
            errors: [{ message: "Something went wrong" }],
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(`${world.community.url}/character/create`);
    await page
      .getByTestId("character-image-picker")
      .locator('input[type="file"]')
      .setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: PNG });
    await page.locator("#name").fill("Half Done");
    await page.getByText(world.species.name, { exact: true }).first().click();
    await page.getByTestId("submit-character").click();

    const progress = page.getByTestId("create-progress-dialog");
    await expect(progress).toContainText("Half Done was created", {
      timeout: 30_000,
    });
    await expect(
      progress.getByRole("link", { name: "Open the image" }),
    ).toHaveAttribute("href", /^\/media\/[0-9a-f-]+$/);
    await expect(
      progress.getByRole("link", { name: "Upload again" }),
    ).toHaveCount(0);
  });
});
