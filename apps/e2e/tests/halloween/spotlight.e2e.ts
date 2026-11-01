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

  // The prize list is public, so it is offered on the community's own host
  // to anyone; the player pages need membership.
  for (const persona of ["anon", "carol"] as const) {
    halloween.describe(`as ${persona}, not a member`, () => {
      halloween.use({ persona });

      halloween("offers the prize list", async ({ page, world }) => {
        await page.goto(world.community.url);
        const s = spotlight(page);
        await s.search("halloween");

        await expect(s.result(/^Candy Boards/)).toHaveCount(0);
        await expect(s.result(/^Candy Swap/)).toHaveCount(0);
        await s.result(/^Prize List/).click();

        await expect(page).toHaveURL(`${world.community.url}/halloween/prizes`);
      });
    });
  }

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
