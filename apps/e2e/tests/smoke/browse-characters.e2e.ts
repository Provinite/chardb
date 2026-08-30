import { presetTest, expect } from "../../src/fixtures.js";

const test = presetTest("community-basic");

// href selectors key off the seeded UUID, so they assert identity rather than
// mere presence -- stronger than a test id and immune to copy changes.
for (const persona of ["anon", "member", "moderator", "siteadmin"] as const) {
  test.describe(`as ${persona}`, () => {
    test.use({ persona });

    test("browses the character list", async ({ page, world }) => {
      await page.goto("/characters");

      // Asserting on content inherently waits past App.tsx's full-page
      // LoadingSpinner; no explicit wait is needed.
      await expect(
        page.getByRole("heading", { level: 1, name: "Browse Characters" }),
      ).toBeVisible();

      await expect(
        page.locator(`a[href="/character/${world.characters.pending.id}"]`),
      ).toBeVisible();
      await expect(
        page.locator(`a[href="/character/${world.characters.plain.id}"]`),
      ).toBeVisible();
    });
  });
}
