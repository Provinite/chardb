import { presetTest, expect } from "../../src/fixtures.js";
import { CFG } from "../../src/config.js";
import { REFRESH_COOKIE_NAME } from "../../src/world/refresh-cookie.js";

const test = presetTest("community-basic");
test.use({ persona: "anon" });

/**
 * What a page load has to reconstruct before it can say who you are.
 *
 * Nothing about a session survives a navigation in the page itself any more:
 * the access token is a module variable, and the refresh token is an
 * `HttpOnly` cookie that no script can read (#339). So every load starts
 * signed out and asks -- `AuthProvider` fires `refreshToken` on mount, and
 * `me` waits on the answer. That ordering is the fragile part, and it is what
 * these specs pin: `useMeQuery` is skipped until the refresh lands, and a
 * skipped query reports `loading: false` immediately, so a provider that
 * cleared `loading` on mount would bounce a perfectly good session to /login
 * before the refresh had a chance to answer.
 *
 * The three cases are the three answers that mount can get: a cookie the
 * server honours, no cookie at all, and a cookie it refuses. The old versions
 * of these specs seeded `localStorage` to make each one; the state now lives
 * where only the browser and the server can put it, so they are made by
 * signing in, by not signing in, and by corrupting the cookie.
 */
test.describe("session restore", () => {
  test("a valid refresh cookie survives a reload", async ({ page, world }) => {
    // The cookie the seeder captured from a real login, replayed exactly as a
    // browser holds it -- and nothing else, since nothing else persists.
    await page.context().addCookies([
      {
        name: REFRESH_COOKIE_NAME,
        value: world.users.moderator.refreshCookie,
        domain: `.${CFG.rootDomain}`,
        path: "/",
      },
    ]);

    await page.goto("/profile");

    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByText(world.users.moderator.username).first(),
    ).toBeVisible();

    // The point of the cookie: this is a fresh load with an empty memory, so
    // the session had to be re-minted from it rather than carried over.
    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByText(world.users.moderator.username).first(),
    ).toBeVisible();
  });

  test("a community page is reached with the same cookie", async ({
    page,
    world,
  }) => {
    await page.context().addCookies([
      {
        name: REFRESH_COOKIE_NAME,
        value: world.users.moderator.refreshCookie,
        domain: `.${CFG.rootDomain}`,
        path: "/",
      },
    ]);

    // A protected page on the community's host rather than the apex, because
    // one cookie covering both is the whole reason it is a cookie.
    await page.goto(`${world.community.url}/moderation/traits`);

    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { level: 2, name: "Trait Review" }),
    ).toBeVisible();
  });

  test("no cookie means signed out", async ({ page }) => {
    // The default context carries none, which is exactly a first-time visitor.
    await page.goto("/profile");

    await expect(page).toHaveURL(/\/login/);
  });

  test("a cookie the server will not honour means signed out", async ({
    page,
  }) => {
    // The guard against over-correcting: waiting for the refresh must not
    // make any cookie look like a session.
    await page.context().addCookies([
      {
        name: REFRESH_COOKIE_NAME,
        value: "not-a-real-refresh-token",
        domain: `.${CFG.rootDomain}`,
        path: "/",
      },
    ]);

    await page.goto("/profile");

    await expect(page).toHaveURL(/\/login/);
  });
});
