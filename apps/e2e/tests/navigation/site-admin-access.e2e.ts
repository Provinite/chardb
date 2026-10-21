import { presetTest, expect } from "../../src/fixtures.js";
import { apexUrl } from "../../src/config.js";

const test = presetTest("community-basic");

/**
 * Site administration pages open only for whoever their resolvers serve
 * (#405). They used to check for a session and nothing else, so any member
 * was shown the admin UI with forbidden errors in place of its content.
 *
 * `commadmin` is the case that keeps this from being a plain isAdmin check:
 * it holds canCreateCommunity without being a site admin, and community
 * management is the only page it has for that.
 */
test.describe("site admin access", () => {
  test.describe("as a member", () => {
    test.use({ persona: "member" });

    for (const path of [
      "/admin",
      "/admin/site-invite-codes",
      "/admin/communities",
      "/admin/deviantart-backfill",
    ]) {
      test(`${path} is not found`, async ({ page }) => {
        await page.goto(apexUrl(path));
        await expect(page.getByText("Page Not Found")).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "Site Administration" }),
        ).toHaveCount(0);
      });
    }
  });

  test.describe("as a community creator", () => {
    test.use({ persona: "commadmin" });

    test("sees only community management", async ({ page }) => {
      await page.goto(apexUrl("/admin"));
      await expect(
        page.getByRole("heading", { name: "Site Administration" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Community Oversight/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Site Invite Codes/ }),
      ).toHaveCount(0);

      await page.goto(apexUrl("/admin/communities"));
      await expect(page.getByText("Page Not Found")).toHaveCount(0);

      await page.goto(apexUrl("/admin/deviantart-backfill"));
      await expect(page.getByText("Page Not Found")).toBeVisible();
    });
  });

  test.describe("as a site admin", () => {
    test.use({ persona: "siteadmin" });

    test("opens every page", async ({ page }) => {
      for (const path of [
        "/admin",
        "/admin/site-invite-codes",
        "/admin/communities",
        "/admin/deviantart-backfill",
      ]) {
        await page.goto(apexUrl(path));
        await expect(page.getByText("Page Not Found")).toHaveCount(0);
      }
    });
  });
});
