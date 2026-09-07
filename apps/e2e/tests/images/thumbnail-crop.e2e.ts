import { presetTest, expect } from "../../src/fixtures.js";
import { apexUrl, CFG } from "../../src/config.js";
import { listImageObjects } from "../../src/db/objects.js";
import { withClient } from "../../src/db/sql.js";

const test = presetTest("community-basic");

/**
 * Choosing how an image's thumbnail is framed (#342).
 *
 * The assertions reach past the UI on purpose. A thumbnail is not rendered
 * anywhere on the page the crop is chosen from -- the media page shows the
 * medium variant -- so "it looks right" is not available, and the things that
 * can actually break are invisible from the browser: whether the rect reached
 * the row, whether the regenerated object landed on a NEW key rather than
 * overwriting one that is served `immutable` for a year, and whether the
 * superseded object was cleaned up instead of leaked.
 */
test.describe("choosing a thumbnail crop", () => {
  test.use({ persona: "member" });

  /**
   * A solid 200x100 PNG.
   *
   * Wider than it is tall, so a square crop is a real choice rather than the
   * whole picture, and small enough to inline on one line -- splitting a
   * base64 literal across lines is a transcription hazard, because `+` is both
   * the concatenation operator and a character in the alphabet.
   */
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAIAAABM5OhcAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAzUlEQVR42u3SMQ0AAAgEsZeDCPwHWZhgYGhSBZfLVMO5SICxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsMBbGwlhgLIyFscBYGAtjgbEwFsYCY2EsjAXGwlgYC4yFsTAWGAtjYSwwFsbCWGAsjIWxwFgYC2OBsTAWxgJjYSyMBcbCWBgLjIWxMBYYC2NhLDAWxsJYYCyMhbHAWBgLY4GxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsjKUCxsJYGAuMhbEwFhgLY2EsMBa/x1one5LWE0ewPwAAAABJRU5ErkJggg==",
    "base64",
  );

  interface ImageRow {
    id: string;
    thumbnail_url: string | null;
    thumbnail_crop_x: number | null;
    thumbnail_crop_y: number | null;
    thumbnail_crop_width: number | null;
    thumbnail_crop_height: number | null;
  }

  /** The image row behind a media item, by that item's title. */
  async function imageRowByTitle(title: string): Promise<ImageRow> {
    return withClient(CFG.databaseUrl, async (client) => {
      const { rows } = await client.query<ImageRow>(
        `SELECT i.id,
                i.thumbnail_url,
                i.thumbnail_crop_x,
                i.thumbnail_crop_y,
                i.thumbnail_crop_width,
                i.thumbnail_crop_height
           FROM images i
           JOIN media m ON m.image_id = i.id
          WHERE m.title = $1`,
        [title],
      );
      expect(rows).toHaveLength(1);
      return rows[0];
    });
  }

  /** Object keys belonging to one image. Other specs share this bucket. */
  async function keysFor(imageId: string): Promise<string[]> {
    const all = await listImageObjects();
    return all.filter((key) => key.startsWith(`${imageId}/`));
  }

  /**
   * Approve an image straight in the database.
   *
   * Re-framing needs an approved image -- `Media.image` masks every URL until
   * then -- and driving the moderation queue as a second persona to get there
   * would make a crop spec fail whenever moderation changes. The approval is
   * setup, not the thing under test.
   */
  async function approveImage(imageId: string): Promise<void> {
    await withClient(CFG.databaseUrl, async (client) => {
      await client.query(
        `UPDATE images SET moderation_status = 'APPROVED' WHERE id = $1`,
        [imageId],
      );
    });
  }

  async function uploadPixelArt(
    page: import("@playwright/test").Page,
    characterId: string,
    title: string,
  ): Promise<void> {
    await page.goto(apexUrl(`/image/upload?character=${characterId}`));
    await page.locator('input[type="file"]').setInputFiles({
      name: "marked.png",
      mimeType: "image/png",
      buffer: PNG,
    });
    await page.getByPlaceholder("Give your image a title...").fill(title);
  }

  test("frames the thumbnail at upload time", async ({ page, world }) => {
    const title = "Crop chosen at upload";

    await uploadPixelArt(page, world.characters.gallery.id, title);

    // Before any choice, the summary says what will happen by default.
    await expect(
      page.getByText("Thumbnail: centre of the image"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Choose crop" }).click();

    // Zooming rather than dragging: it moves the rect by a definite amount
    // through a control with a stable id, where a synthetic drag over a canvas
    // is the kind of thing that passes locally and flakes in CI.
    await page.locator("#thumbnail-crop-zoom").fill("2");
    await page.getByRole("button", { name: "Use this crop" }).click();

    await expect(page.getByText("Thumbnail: your crop")).toBeVisible();

    await page
      .getByRole("button", { name: /upload/i })
      .first()
      .click();
    await expect(page.getByText("Upload Successful!")).toBeVisible({
      timeout: 30_000,
    });

    const row = await imageRowByTitle(title);

    // A square, inside the 200x100 image, and tighter than the whole height --
    // which is what zooming in past 1 has to mean.
    expect(row.thumbnail_crop_width).toBe(row.thumbnail_crop_height);
    expect(row.thumbnail_crop_width!).toBeGreaterThan(0);
    expect(row.thumbnail_crop_width!).toBeLessThan(100);
    expect(row.thumbnail_crop_x!).toBeGreaterThanOrEqual(0);
    expect(
      row.thumbnail_crop_x! + row.thumbnail_crop_width!,
    ).toBeLessThanOrEqual(200);
    expect(
      row.thumbnail_crop_y! + row.thumbnail_crop_height!,
    ).toBeLessThanOrEqual(100);

    expect(await keysFor(row.id)).toContain(`${row.id}/thumbnail.png`);
  });

  /**
   * The bug this pins down was invisible from the code and obvious in the
   * browser: `Media.image` replaces every URL with a placeholder graphic until
   * an image is approved, for everyone including the person who uploaded it.
   * Offering the cropper then frames the "pending moderation" picture and
   * measures a rect against ITS dimensions, which either lands on the wrong
   * part of the real artwork or fails validation for reasons no one can see.
   */
  test("does not offer re-framing until the image is approved", async ({
    page,
    world,
  }) => {
    const title = "Still awaiting moderation";

    await uploadPixelArt(page, world.characters.gallery.id, title);
    await page
      .getByRole("button", { name: /upload/i })
      .first()
      .click();
    await expect(page.getByText("Upload Successful!")).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("link", { name: "View Image" }).click();

    // The owner's own controls are there, so this is the crop control being
    // withheld rather than the whole action row being absent.
    await expect(
      page.getByRole("button", { name: "Edit Content" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Adjust Thumbnail" }),
    ).toHaveCount(0);

    await approveImage((await imageRowByTitle(title)).id);
    await page.reload();

    await expect(
      page.getByRole("button", { name: "Adjust Thumbnail" }),
    ).toBeVisible();
  });

  test("re-frames an approved thumbnail, then puts it back", async ({
    page,
    world,
  }) => {
    const title = "Crop changed afterwards";

    await uploadPixelArt(page, world.characters.gallery.id, title);
    await page
      .getByRole("button", { name: /upload/i })
      .first()
      .click();
    await expect(page.getByText("Upload Successful!")).toBeVisible({
      timeout: 30_000,
    });

    const before = await imageRowByTitle(title);
    expect(before.thumbnail_crop_x).toBeNull();
    const originalThumbnailUrl = before.thumbnail_url;

    await approveImage(before.id);

    await page.getByRole("link", { name: "View Image" }).click();
    await page.reload();
    await page.getByRole("button", { name: "Adjust Thumbnail" }).click();

    await page.locator("#thumbnail-crop-zoom").fill("2");
    await page.getByRole("button", { name: "Use this crop" }).click();

    // Poll the row instead of waiting on the toast. react-hot-toast leaves a
    // message up for seconds, so the second save's `toBeVisible` would match
    // the FIRST toast and wait for nothing -- which is exactly how the reset
    // assertion below passed against a row that had not been written yet.
    await expect
      .poll(async () => (await imageRowByTitle(title)).thumbnail_crop_x, {
        timeout: 30_000,
      })
      .not.toBeNull();

    const reframed = await imageRowByTitle(title);
    expect(reframed.thumbnail_crop_width).toBe(reframed.thumbnail_crop_height);

    // A new URL, not the old one rewritten. The old object is served with a
    // year of immutable caching, so reusing the key would show the previous
    // framing to everyone who had already loaded it.
    expect(reframed.thumbnail_url).not.toBe(originalThumbnailUrl);

    const keys = await keysFor(reframed.id);
    expect(keys).not.toContain(`${reframed.id}/thumbnail.png`);
    expect(keys.some((key) => /\/thumbnail-[^/]+\.png$/.test(key))).toBe(true);

    // And back to the automatic framing. "Reset to centre" only renders once
    // the refetch has told the page a crop exists, so the click waits for it.
    await page.getByRole("button", { name: "Adjust Thumbnail" }).click();
    await page.getByRole("button", { name: "Reset to centre" }).click();

    await expect
      .poll(async () => (await imageRowByTitle(title)).thumbnail_crop_x, {
        timeout: 30_000,
      })
      .toBeNull();

    const reset = await imageRowByTitle(title);
    expect(reset.thumbnail_crop_y).toBeNull();
    expect(reset.thumbnail_crop_width).toBeNull();
    expect(reset.thumbnail_crop_height).toBeNull();

    // Clearing the framing re-renders too, so it also moves the object.
    expect(reset.thumbnail_url).not.toBe(reframed.thumbnail_url);

    // And nobody else is offered it. Folded in here rather than given its own
    // test because the setup is a whole upload, and the assertion only means
    // anything against an image whose owner WOULD be offered the control --
    // which the reset above has just demonstrated.
    const mediaUrl = page.url();
    await page.context().clearCookies();
    await page.goto(mediaUrl);

    await expect(
      page.getByRole("button", { name: "Adjust Thumbnail" }),
    ).toHaveCount(0);
  });
});
