import type { Browser, Page } from "@playwright/test";
import { presetTest, expect } from "../../src/fixtures.js";
import { apexUrl, CFG } from "../../src/config.js";
import { withClient } from "../../src/db/sql.js";

const test = presetTest("community-basic");

/**
 * The site-wide image queue (#404).
 *
 * An avatar uploaded at the apex names no community, so no community's
 * moderators are shown it. The user was told it was waiting on a moderator
 * while the only queue it reached had no page -- so it waited forever. This
 * is the whole round trip: upload at the apex, approve as a site admin from
 * the site admin page, and the owner then sees their avatar.
 */
test.describe("site-wide image queue", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  /** A 200x100 PNG; the same one the avatar settings spec uploads. */
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAIAAABM5OhcAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAzUlEQVR42u3SMQ0AAAgEsZeDCPwHWZhgYGhSBZfLVMO5SICxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsMBbGwlhgLIyFscBYGAtjgbEwFsYCY2EsjAXGwlgYC4yFsTAWGAtjYSwwFsbCWGAsjIWxwFgYC2OBsTAWxgJjYSyMBcbCWBgLjIWxMBYYC2NhLDAWxsJYYCyMhbHAWBgLY4GxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsjKUCxsJYGAuMhbEwFhgLY2EsMBa/x1one5LWE0ewPwAAAABJRU5ErkJggg==",
    "base64",
  );

  async function pageAs(
    browser: Browser,
    storageState: string,
  ): Promise<{ page: Page; close: () => Promise<void> }> {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    return { page, close: () => context.close() };
  }

  interface AvatarRow {
    image_id: string;
    community_id: string | null;
    moderation_status: string;
  }

  async function avatarRow(username: string): Promise<AvatarRow> {
    return withClient(CFG.databaseUrl, async (client) => {
      const { rows } = await client.query<AvatarRow>(
        `SELECT i.id AS image_id, m.community_id, i.moderation_status
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

  /** Pending images the site-wide queue can list: those some media holds. */
  async function pendingWithMedia(): Promise<number> {
    return withClient(CFG.databaseUrl, async (client) => {
      const { rows } = await client.query<{ count: string }>(
        `SELECT count(*) FROM images i
          WHERE i.moderation_status = 'PENDING'
            AND EXISTS (SELECT 1 FROM media m WHERE m.image_id = i.id)`,
      );
      return Number(rows[0].count);
    });
  }

  /** Upload an avatar from the apex, where there is no community to name. */
  async function uploadAvatarAtApex(page: Page): Promise<AvatarRow> {
    await page.goto(apexUrl("/profile/edit"));

    await page.getByRole("button", { name: "Upload a picture" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: PNG,
    });
    await expect(page.getByText("Frame your avatar")).toBeVisible();
    await page.getByRole("button", { name: "Use this crop" }).click();

    await expect(
      page.getByText("Waiting on a moderator", { exact: false }),
    ).toBeVisible({ timeout: 30_000 });

    const row = await avatarRow("member");
    // The precondition for the bug: no community will ever be shown this.
    expect(row.community_id).toBeNull();
    expect(row.moderation_status).toBe("PENDING");
    return row;
  }

  test("an avatar uploaded at the apex is approved by a site admin and then shown", async ({
    page,
    browser,
    world,
  }) => {
    const row = await uploadAvatarAtApex(page);

    // Withheld until approved, from the owner's public profile as from anyone.
    await page.goto(apexUrl("/user/member"));
    await expect(page.locator(`img[src*="${row.image_id}"]`)).toHaveCount(0);

    const admin = await pageAs(browser, world.storageState("siteadmin"));
    try {
      // The seeded world has pending uploads of its own, so the badge is held
      // to what the queue can actually list rather than to a constant.
      const pending = await pendingWithMedia();
      expect(pending).toBeGreaterThan(0);

      await admin.page.goto(apexUrl("/admin"));
      const entry = admin.page.getByRole("link", { name: /Image Moderation/ });
      await expect(entry).toContainText(`${pending} pending`);
      await entry.click();

      await expect(admin.page).toHaveURL(apexUrl("/admin/moderation/images"));
      await expect(admin.page.getByText(`${pending} pending`)).toBeVisible();

      // The card shows the real picture: pendingModerationImage resolves for a
      // site admin even though the media has no community to check against.
      const picture = admin.page.locator(`img[src*="${row.image_id}"]`);
      await expect(picture.first()).toBeVisible();

      const approve = admin.page.getByRole("button", { name: "Approve" });
      // The innermost element holding both this picture and an Approve
      // button is this upload's card; every other match is an ancestor.
      const card = admin.page
        .locator("div")
        .filter({ has: picture })
        .filter({ has: approve })
        .last();
      await card.getByRole("button", { name: "Approve" }).click();

      await expect(
        admin.page.getByText(`${pending - 1} pending`),
      ).toBeVisible();
      await expect(picture).toHaveCount(0);
    } finally {
      await admin.close();
    }

    expect((await avatarRow("member")).moderation_status).toBe("APPROVED");

    // Back as the owner: the wait is over and the picture is theirs.
    await page.goto(apexUrl("/profile/edit"));
    await expect(
      page.getByText("Waiting on a moderator", { exact: false }),
    ).toHaveCount(0);
    await expect(
      page.locator(`img[src*="${row.image_id}"]`).first(),
    ).toBeVisible();

    await page.goto(apexUrl("/user/member"));
    await expect(
      page.locator(`img[src*="${row.image_id}"]`).first(),
    ).toBeVisible();
  });

  /**
   * Someone else's pending upload must not reach a member who types the
   * address in. The route shows them not found (#405), but the server is what
   * actually keeps the queue to site admins.
   */
  test("a member who opens the site-wide queue is shown nothing", async ({
    page,
    browser,
    world,
  }) => {
    const other = await pageAs(browser, world.storageState("othermember"));
    let row: AvatarRow;
    try {
      await other.page.goto(apexUrl("/profile/edit"));
      await other.page
        .getByRole("button", { name: "Upload a picture" })
        .click();
      await other.page.locator('input[type="file"]').setInputFiles({
        name: "avatar.png",
        mimeType: "image/png",
        buffer: PNG,
      });
      await other.page.getByRole("button", { name: "Use this crop" }).click();
      await expect(
        other.page.getByText("Waiting on a moderator", { exact: false }),
      ).toBeVisible({ timeout: 30_000 });
      row = await avatarRow("othermember");
    } finally {
      await other.close();
    }

    // Not found since #405, rather than the queue page with a load error; the
    // server refusing the query is still what keeps the picture back.
    await page.goto(apexUrl("/admin/moderation/images"));
    await expect(page.getByText("Page Not Found")).toBeVisible();
    await expect(page.locator(`img[src*="${row.image_id}"]`)).toHaveCount(0);
  });
});
