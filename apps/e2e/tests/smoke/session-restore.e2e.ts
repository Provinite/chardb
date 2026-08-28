import { test, expect } from "../../src/fixtures.js";

test.use({ preset: "community-basic", persona: "anon" });

/**
 * A valid access token alone must be enough to restore a session.
 *
 * `me` is gated on `accessToken`; a refresh token is how you renew an expired
 * access token, not a precondition for being logged in. Before the fix these
 * redirected to /login despite a valid token, because AuthProvider's mount
 * effect cleared `loading` before the `me` query resolved.
 *
 * Scope, so nobody mistakes these for a regression guard on a live bug: no
 * application path produces this state. login/signup write both tokens,
 * refreshAccessToken overwrites only the access token and leaves the refresh
 * token alone, and logout and the Apollo 401 handler clear both. localStorage
 * does not expire entries either -- JWT expiry lives inside the token. These
 * pin correct behavior for a state that is representable but not currently
 * produced; treat them as hardening, not as covering a reported failure.
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
