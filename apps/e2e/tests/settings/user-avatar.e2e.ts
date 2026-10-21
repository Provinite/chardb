import { presetTest, expect } from "../../src/fixtures.js";
import { apexUrl, CFG } from "../../src/config.js";
import { withClient } from "../../src/db/sql.js";

const test = presetTest("community-basic");

/**
 * Setting a user avatar (#345), since #410.
 *
 * Avatars are not moderated and are not posts. What is worth asserting is
 * that an upload is the whole job -- no Media row, nothing waiting on a
 * moderator, shown to visitors straight away -- and that the chosen crop
 * reaches the row, so an avatar is framed rather than centred.
 */
test.describe("choosing an avatar", () => {
  test.use({ persona: "member" });

  /**
   * Every test here starts from a member with no avatar.
   *
   * Tests in a file share a world by default, and these all leave one set,
   * so a later test's waits would be satisfied by an earlier test's upload.
   */
  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  /**
   * A 200x100 PNG, wider than it is tall, so a square crop is a genuine
   * choice rather than the whole picture.
   */
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAIAAABM5OhcAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAzUlEQVR42u3SMQ0AAAgEsZeDCPwHWZhgYGhSBZfLVMO5SICxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsMBbGwlhgLIyFscBYGAtjgbEwFsYCY2EsjAXGwlgYC4yFsTAWGAtjYSwwFsbCWGAsjIWxwFgYC2OBsTAWxgJjYSyMBcbCWBgLjIWxMBYYC2NhLDAWxsJYYCyMhbHAWBgLY4GxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsjKUCxsJYGAuMhbEwFhgLY2EsMBa/x1one5LWE0ewPwAAAABJRU5ErkJggg==",
    "base64",
  );

  interface AvatarRow {
    image_id: string;
    is_avatar_upload: boolean;
    moderation_status: string;
    media_count: string;
    thumbnail_crop_width: number | null;
    thumbnail_crop_height: number | null;
  }

  /** The image a username's avatar points at, and how many media hold it. */
  async function avatarRow(username: string): Promise<AvatarRow> {
    return withClient(CFG.databaseUrl, async (client) => {
      const { rows } = await client.query<AvatarRow>(
        `SELECT i.id AS image_id,
                i.is_avatar_upload,
                i.moderation_status,
                (SELECT count(*) FROM media m WHERE m.image_id = i.id)
                  AS media_count,
                i.thumbnail_crop_width,
                i.thumbnail_crop_height
           FROM users u
           JOIN images i ON i.id = u.avatar_image_id
          WHERE u.username = $1`,
        [username],
      );
      expect(rows).toHaveLength(1);
      return rows[0];
    });
  }

  /**
   * Upload an avatar from `origin`, framing it through the cropper, and wait
   * for it to be showing.
   *
   * Zoom rather than drag: it moves the rect by a definite amount through a
   * control with a stable id, where a synthetic drag over a canvas is the kind
   * of thing that passes locally and flakes in CI.
   */
  async function uploadAvatarFrom(
    page: import("@playwright/test").Page,
    origin: string,
  ): Promise<AvatarRow> {
    await page.goto(`${origin}/profile/edit`);

    await page.getByRole("button", { name: "Upload a picture" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: PNG,
    });

    await expect(page.getByText("Frame your avatar")).toBeVisible();
    await page.locator("#thumbnail-crop-zoom").fill("2");
    await page.getByRole("button", { name: "Use this crop" }).click();

    // "Remove" appears only once there is an avatar to remove.
    await expect(page.getByRole("button", { name: "Remove" })).toBeVisible({
      timeout: 30_000,
    });
    return avatarRow("member");
  }

  test("stores an unmoderated avatar with the chosen crop and no media", async ({
    page,
  }) => {
    const row = await uploadAvatarFrom(page, apexUrl());

    // A square, inside the 200x100 image, and tighter than the whole height --
    // which is what zooming past 1 has to mean.
    expect(row.thumbnail_crop_width).toBe(row.thumbnail_crop_height);
    expect(row.thumbnail_crop_width!).toBeGreaterThan(0);
    expect(row.thumbnail_crop_width!).toBeLessThan(100);

    expect(row.is_avatar_upload).toBe(true);
    expect(row.moderation_status).toBe("APPROVED");
    expect(Number(row.media_count)).toBe(0);
    await expect(
      page.getByText("Waiting on a moderator", { exact: false }),
    ).toHaveCount(0);
  });

  /** From a community host it is the same upload: no community reviews it. */
  test("is shown to visitors straight away", async ({ page, world }) => {
    const row = await uploadAvatarFrom(page, world.community.url);

    await page.goto(apexUrl("/user/member"));
    await expect(
      page.locator(`img[src*="${row.image_id}"]`).first(),
    ).toBeVisible();
  });

  /** The avatar it replaces is deleted, row and all. */
  test("replaces the previous avatar", async ({ page }) => {
    const first = await uploadAvatarFrom(page, apexUrl());

    // A fresh file input: the hidden one is cleared after each pick.
    await page.getByRole("button", { name: "Upload a picture" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: PNG,
    });
    await page.getByRole("button", { name: "Use this crop" }).click();
    await expect
      .poll(async () => (await avatarRow("member")).image_id, {
        timeout: 30_000,
      })
      .not.toBe(first.image_id);

    const remaining = await withClient(CFG.databaseUrl, async (client) => {
      const { rows } = await client.query<{ count: string }>(
        `SELECT count(*) FROM images WHERE id = $1`,
        [first.image_id],
      );
      return Number(rows[0].count);
    });
    expect(remaining).toBe(0);
  });

  test("removes an avatar again", async ({ page }) => {
    await uploadAvatarFrom(page, apexUrl());

    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);

    const cleared = await withClient(CFG.databaseUrl, async (client) => {
      const { rows } = await client.query<{ avatar_image_id: string | null }>(
        `SELECT avatar_image_id FROM users WHERE username = $1`,
        ["member"],
      );
      return rows[0].avatar_image_id;
    });
    expect(cleared).toBeNull();
  });

  test("offers no picker of existing media", async ({ page }) => {
    await page.goto(apexUrl("/profile/edit"));

    await expect(
      page.getByRole("button", { name: "Upload a picture" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Choose from your media" }),
    ).toHaveCount(0);
  });
});
