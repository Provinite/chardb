import { presetTest, expect } from "../../src/fixtures.js";
import { spotlight } from "../../src/spotlight.js";

const halloween = presetTest("halloween-prizes");

/**
 * The page search offers the Halloween pages while the event is on, as the
 * sidebar does: the player pages to every member, the event page to staff
 * who can grant or manage items. With the event off, see
 * `navigation/spotlight.e2e.ts`.
 */
halloween.describe("Halloween pages in the page search", () => {
  halloween.describe("as a member", () => {
    halloween.use({ persona: "bob" });

    halloween.beforeEach(async ({ page, world }) => {
      await page.goto(world.community.url);
    });

    halloween("offers the player pages", async ({ page }) => {
      const s = spotlight(page);
      await s.search("halloween");

      await expect(s.result(/^Prize List/)).toBeVisible();
      await expect(s.result(/^Candy Boards/)).toBeVisible();
      await expect(s.result(/^Candy Swap/)).toBeVisible();
      await expect(s.result(/^Halloween Event/)).toHaveCount(0);
    });

    halloween("goes to the candy boards", async ({ page, world }) => {
      const s = spotlight(page);
      await s.search("candy boards");
      await s.result(/^Candy Boards/).click();

      await expect(page).toHaveURL(`${world.community.url}/halloween/board`);
    });
  });

  halloween.describe("as staff", () => {
    halloween.use({ persona: "alice" });

    halloween("offers the event page", async ({ page, world }) => {
      await page.goto(world.community.url);
      const s = spotlight(page);
      await s.search("halloween event");
      await s.result(/^Halloween Event/).click();

      await expect(page).toHaveURL(`${world.community.url}/admin/halloween`);
    });
  });
});
