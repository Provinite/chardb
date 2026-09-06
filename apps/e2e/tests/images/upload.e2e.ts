import { presetTest, expect } from "../../src/fixtures.js";
import { apexUrl } from "../../src/config.js";
import { listImageObjects } from "../../src/db/objects.js";

const test = presetTest("community-basic");

/**
 * Uploading an image, through the browser and all the way to S3.
 *
 * This exists because nothing covered it and it broke. The upload is a plain
 * `fetch` to `POST /images/upload`, not a GraphQL call, so it authenticates by
 * putting the access token in an `Authorization` header by hand. When the token
 * moved out of `localStorage` and into memory (#339), the four places that read
 * it directly kept reading `localStorage.getItem("accessToken")` and started
 * sending `Bearer null`. Every signed-in user's upload 401'd, and the whole
 * suite stayed green: the presets create image ROWS in Prisma and never touch
 * the endpoint.
 *
 * So the assertions here are deliberately end to end. A spec that stubbed the
 * network, or seeded a row, would have passed throughout.
 */
test.describe("uploading an image", () => {
  test.use({ persona: "member" });

  // A one-pixel PNG. Small enough to inline, real enough that the backend's
  // sharp pipeline processes it rather than rejecting it as malformed.
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  test("puts a real object in the bucket and shows the image", async ({
    page,
    world,
  }) => {
    const before = await listImageObjects();

    // `?character=` preselects the character the upload attaches to, which the
    // form requires. Driving the typeahead instead would make this a test of
    // the typeahead, failing for reasons that have nothing to do with uploads.
    //
    // `gallery` rather than `plain`: this persona owns it, and the preset set
    // it aside precisely so that adding media cannot disturb the trait-review
    // or moderation fixtures. Uploading to a character you do not own is
    // refused, which this spec discovered the hard way.
    await page.goto(
      apexUrl(`/image/upload?character=${world.characters.gallery.id}`),
    );

    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: PNG });

    // By placeholder, not by label: this form's labels are not associated with
    // their inputs.
    await page
      .getByPlaceholder("Give your image a title...")
      .fill("A single pixel");
    await page
      .getByRole("button", { name: /upload/i })
      .first()
      .click();

    // The success state only renders after the endpoint answered 200, so this
    // is the assertion that would have caught `Bearer null`.
    await expect(page.getByText("Upload Successful!")).toBeVisible({
      timeout: 30_000,
    });

    // And the bytes really landed: a 200 with nothing in the bucket would mean
    // the backend answered without storing anything.
    const after = await listImageObjects();
    expect(after.length).toBeGreaterThan(before.length);
  });

  test("the uploaded image is reachable on its own page", async ({
    page,
    world,
  }) => {
    await page.goto(
      apexUrl(`/image/upload?character=${world.characters.gallery.id}`),
    );

    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: PNG });
    await page
      .getByPlaceholder("Give your image a title...")
      .fill("Reachable pixel");
    await page
      .getByRole("button", { name: /upload/i })
      .first()
      .click();

    await expect(page.getByText("Upload Successful!")).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("link", { name: "View Image" }).click();

    await expect(page.getByText("Reachable pixel")).toBeVisible();
    // The <img> resolves rather than 404ing, which is the difference between a
    // row that claims a URL and an object that is actually there.
    const img = page.locator("img").first();
    await expect(img).toBeVisible();
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
  });

  test("a signed-out visitor cannot reach the upload page", async ({
    page,
  }) => {
    // Uploading is the one thing here that must not work anonymously, and the
    // endpoint's own guard is not what a person meets first.
    await page.context().clearCookies();
    await page.goto(apexUrl("/image/upload"));

    await expect(page).toHaveURL(/\/login/);
  });
});
