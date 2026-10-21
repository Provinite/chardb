import type { Browser, Page } from "@playwright/test";
import { presetTest, expect } from "../../src/fixtures.js";
import { apexUrl, CFG } from "../../src/config.js";
import { withClient } from "../../src/db/sql.js";
import type { Actor } from "../../src/world/types.js";

const test = presetTest("community-basic");

/**
 * The site-wide image queue (#404).
 *
 * A picture uploaded with no character and no community is shown to no
 * community's moderators, and until the site-wide queue had a page nobody
 * could approve it. This is the whole round trip: upload, approve as a site
 * admin from the site admin page, and the owner then sees their picture.
 *
 * It used to be told with an avatar uploaded at the apex. Avatars have not
 * been moderated since #410, so a plain upload is now the case that reaches
 * this queue.
 */
test.describe("site-wide image queue", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  /** A 200x100 PNG. */
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

  interface UploadRow {
    media_id: string;
    image_id: string;
    community_id: string | null;
    moderation_status: string;
  }

  /** The media a username uploaded under `title`, with its image. */
  async function uploadRow(
    username: string,
    title: string,
  ): Promise<UploadRow> {
    return withClient(CFG.databaseUrl, async (client) => {
      const { rows } = await client.query<UploadRow>(
        `SELECT m.id AS media_id, i.id AS image_id, m.community_id,
                i.moderation_status
           FROM media m
           JOIN users u ON u.id = m.owner_id
           JOIN images i ON i.id = m.image_id
          WHERE u.username = $1 AND m.title = $2`,
        [username, title],
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

  /**
   * Upload a picture with no character and no community, which is what lands
   * in this queue and nowhere else.
   *
   * Through the API: no form in the app sends one since #410 -- the upload
   * page requires a character and item-type pictures are uploaded from a
   * community host -- but the endpoint still accepts it.
   */
  async function uploadWithoutCommunity(
    actor: Actor,
    username: string,
    title: string,
  ): Promise<UploadRow> {
    const body = new FormData();
    body.append(
      "file",
      new Blob([new Uint8Array(PNG)], { type: "image/png" }),
      "picture.png",
    );
    body.append("title", title);
    const response = await actor.rest("/images/upload", {
      method: "POST",
      body,
    });
    expect(response.status).toBe(201);

    const row = await uploadRow(username, title);
    // The precondition for the bug: no community will ever be shown this.
    expect(row.community_id).toBeNull();
    expect(row.moderation_status).toBe("PENDING");
    return row;
  }

  test("a picture with no community is approved by a site admin and then shown", async ({
    page,
    browser,
    world,
  }) => {
    const row = await uploadWithoutCommunity(
      world.as("member"),
      "member",
      "Apex picture",
    );

    // Masked until approved, even to its owner.
    await page.goto(apexUrl(`/media/${row.media_id}`));
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

    expect((await uploadRow("member", "Apex picture")).moderation_status).toBe(
      "APPROVED",
    );

    // Back as the owner: the picture is shown.
    await page.goto(apexUrl(`/media/${row.media_id}`));
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
    world,
  }) => {
    const row = await uploadWithoutCommunity(
      world.as("othermember"),
      "othermember",
      "Someone else's",
    );

    await page.goto(apexUrl("/admin/moderation/images"));
    await expect(page.getByText("Page Not Found")).toBeVisible();
    await expect(page.locator(`img[src*="${row.image_id}"]`)).toHaveCount(0);
  });
});
