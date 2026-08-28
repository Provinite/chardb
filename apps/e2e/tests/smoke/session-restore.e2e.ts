import { test, expect } from "../../src/fixtures.js";

test.use({ preset: "community-basic", persona: "anon" });

/**
 * A valid access token alone must be enough to restore a session.
 *
 * `me` is gated on `accessToken`, and a refresh token is an optimization for
 * renewing an expired one -- not a precondition for being logged in. A session
 * holding only an access token is reachable in normal use: the refresh token
 * expires after 7 days while the access token lasts 24 hours, so any tab open
 * across that boundary, or any client that stores only what it needs, lands
 * here.
 */
test.describe("session restore with only an access token", () => {
  test("stays on a protected route", async ({ page, world }) => {
    const moderator = world.users.moderator;

    // Seed ONLY the access token, then load a protected route.
    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.clear();
      localStorage.setItem("accessToken", token);
    }, moderator.accessToken);

    await page.goto(`${world.community.url}/moderation/traits`);

    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { level: 2, name: "Trait Review" }),
    ).toBeVisible();
  });

  test("resolves the current user", async ({ page, world }) => {
    const moderator = world.users.moderator;

    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.clear();
      localStorage.setItem("accessToken", token);
    }, moderator.accessToken);

    await page.goto("/profile");

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText(moderator.username).first()).toBeVisible();
  });

  test("still redirects to login when the access token is invalid", async ({
    page,
  }) => {
    // The guard against over-correcting: fixing the above must not make a
    // bogus token look like a valid session.
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("accessToken", "not-a-real-token");
    });

    await page.goto("/profile");

    await expect(page).toHaveURL(/\/login/);
  });
});
