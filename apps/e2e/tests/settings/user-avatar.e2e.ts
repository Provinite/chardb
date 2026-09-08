import { presetTest, expect } from "../../src/fixtures.js";
import { apexUrl, CFG } from "../../src/config.js";
import { withClient } from "../../src/db/sql.js";

const test = presetTest("community-basic");

/**
 * Setting a user avatar (#345).
 *
 * `User.avatarImageId` was wired for reading only, so every avatar in the app
 * fell through to initials permanently. What is worth asserting is not that a
 * picture appears -- it does not, not straight away -- but the three things
 * that were easy to get wrong:
 *
 *   - the chosen crop reaches the row, so an avatar is framed rather than
 *     centred, and
 *   - the upload records which community should review it, which is the whole
 *     reason the profile editor is served from a community host at all, and
 *   - an unapproved avatar is withheld from visitors while the owner is told
 *     why, rather than silently showing initials as if the save had failed.
 *
 * The last one is the security-shaped assertion: an avatar is the one image
 * that does not reach a viewer through `Media.image`, where everything else
 * masks unapproved URLs.
 */
test.describe("choosing an avatar", () => {
  test.use({ persona: "member" });

  /**
   * Every test here starts from a member with no avatar.
   *
   * Tests in a file share a world by default, and these all leave one set --
   * which made them lie to each other. "Waiting on a moderator" is on the page
   * from the *previous* test's upload, so the next test's wait for it returned
   * immediately, and the spec went on to read and approve the old image while
   * the new upload was still in flight. It passed or failed on timing, which
   * is to say on what had run before it.
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
    community_id: string | null;
    moderation_status: string;
    thumbnail_crop_x: number | null;
    thumbnail_crop_y: number | null;
    thumbnail_crop_width: number | null;
    thumbnail_crop_height: number | null;
  }

  /** The image a username's avatar points at, with its media's community. */
  async function avatarRow(username: string): Promise<AvatarRow> {
    return withClient(CFG.databaseUrl, async (client) => {
      const { rows } = await client.query<AvatarRow>(
        `SELECT i.id            AS image_id,
                m.community_id,
                i.moderation_status,
                i.thumbnail_crop_x,
                i.thumbnail_crop_y,
                i.thumbnail_crop_width,
                i.thumbnail_crop_height
           FROM users u
           JOIN images i ON i.id = u.avatar_image_id
           LEFT JOIN media m ON m.image_id = i.id
          WHERE u.username = $1`,
        [username],
      );
      expect(rows).toHaveLength(1);
      return rows[0];
    });
  }

  async function approveImage(imageId: string): Promise<void> {
    await withClient(CFG.databaseUrl, async (client) => {
      await client.query(
        `UPDATE images SET moderation_status = 'APPROVED' WHERE id = $1`,
        [imageId],
      );
    });
  }

  /**
   * Upload an avatar from `origin`, framing it through the cropper.
   *
   * Zoom rather than drag: it moves the rect by a definite amount through a
   * control with a stable id, where a synthetic drag over a canvas is the kind
   * of thing that passes locally and flakes in CI.
   */
  async function uploadAvatarFrom(
    page: import("@playwright/test").Page,
    origin: string,
  ): Promise<void> {
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
  }

  test("records the crop and the reviewing community", async ({
    page,
    world,
  }) => {
    await uploadAvatarFrom(page, world.community.url);

    await expect(
      page.getByText("Waiting on a moderator", { exact: false }),
    ).toBeVisible({ timeout: 30_000 });

    const row = await avatarRow("member");

    // A square, inside the 200x100 image, and tighter than the whole height --
    // which is what zooming past 1 has to mean.
    expect(row.thumbnail_crop_width).toBe(row.thumbnail_crop_height);
    expect(row.thumbnail_crop_width!).toBeGreaterThan(0);
    expect(row.thumbnail_crop_width!).toBeLessThan(100);

    // The point of serving this page from a community host: the upload knows
    // whose queue it belongs in. Uploaded at the apex this would be null, and
    // only a site admin could ever clear it.
    expect(row.community_id).toBe(world.community.id);
    expect(row.moderation_status).toBe("PENDING");
  });

  /**
   * The gate that matters. Between upload and approval the avatar exists, is
   * referenced by the profile, and must still not be served to anyone.
   */
  test("withholds an unapproved avatar from visitors", async ({
    page,
    world,
  }) => {
    await uploadAvatarFrom(page, world.community.url);
    await expect(
      page.getByText("Waiting on a moderator", { exact: false }),
    ).toBeVisible({ timeout: 30_000 });

    const row = await avatarRow("member");

    await page.goto(apexUrl("/user/member"));
    // Initials, not a picture: the fallback for someone who has never set one.
    await expect(page.locator(`img[src*="${row.image_id}"]`)).toHaveCount(0);

    await approveImage(row.image_id);

    await page.reload();
    await expect(
      page.locator(`img[src*="${row.image_id}"]`).first(),
    ).toBeVisible();
  });

  test("removes an avatar again", async ({ page, world }) => {
    await uploadAvatarFrom(page, world.community.url);
    await expect(
      page.getByText("Waiting on a moderator", { exact: false }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Remove" }).click();

    await expect(
      page.getByText("Waiting on a moderator", { exact: false }),
    ).toHaveCount(0);

    const cleared = await withClient(CFG.databaseUrl, async (client) => {
      const { rows } = await client.query<{ avatar_image_id: string | null }>(
        `SELECT avatar_image_id FROM users WHERE username = $1`,
        ["member"],
      );
      return rows[0].avatar_image_id;
    });
    expect(cleared).toBeNull();
  });
});
