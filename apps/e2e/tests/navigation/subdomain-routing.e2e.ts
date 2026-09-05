import { presetTest, expect } from "../../src/fixtures.js";
import { communityUrl } from "../../src/config.js";

const test = presetTest("community-basic");

/**
 * The host is the community (#339).
 *
 * `/communities/:communityId/...` is gone. A community is served from its own
 * subdomain with its pages at the root of it, and which route table the bundle
 * mounts is decided by `window.location.hostname` before the router sees
 * anything. That makes a handful of behaviours new, and none of them is
 * visible to a spec that stays on one host:
 *
 *   - a community host serves community pages at the root path, framed by
 *     community navigation, while the apex serves the site's own pages framed
 *     by global navigation;
 *   - every old URL still works, by resolving the id in it to a slug and
 *     forwarding to that host -- a redirect across ORIGINS, which the router
 *     cannot do and a whole-page navigation must;
 *   - the wildcard record answers for every label, so a subdomain no community
 *     holds is a page to render rather than an error;
 *   - and one sign-in covers all of it, which is the reason the refresh token
 *     had to leave `localStorage` for a cookie on the parent domain. That last
 *     one is what would break silently: every other spec would still pass with
 *     a session that stopped at the apex, because storageState seeds the
 *     cookie directly.
 */
test.describe("community hosts", () => {
  test.use({ persona: "member" });

  const communityNav = (page: import("@playwright/test").Page) =>
    page.getByRole("navigation", { name: "Community navigation" });
  const globalNav = (page: import("@playwright/test").Page) =>
    page.getByRole("navigation", { name: "Global navigation" });

  test("serves the community at the root of its own host", async ({
    page,
    world,
  }) => {
    await page.goto(world.community.url);

    await expect(
      page.getByRole("heading", { level: 1, name: world.community.name }),
    ).toBeVisible();
    await expect(communityNav(page)).toBeVisible();

    // And its pages hang directly off that root, with no community segment
    // left in the path to carry the id.
    await page.goto(`${world.community.url}/members`);
    await expect(page).toHaveURL(`${world.community.url}/members`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Members" }),
    ).toBeVisible();
    await expect(communityNav(page)).toBeVisible();
  });

  test("the apex is a different site, with global navigation", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(globalNav(page)).toBeVisible();
    await expect(communityNav(page)).toHaveCount(0);
  });

  test("a legacy /communities/:id URL forwards to the host", async ({
    page,
    world,
  }) => {
    // Every link ever shared, and every bookmark. One route covers all of the
    // old paths because the translation is mechanical once the id has been
    // resolved to a slug -- which is why it fetches before redirecting.
    await page.goto(`/communities/${world.community.id}/members`);

    await expect(page).toHaveURL(`${world.community.url}/members`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Members" }),
    ).toBeVisible();
  });

  test("a character reached at the apex moves to its community", async ({
    page,
    world,
  }) => {
    // A character belongs to a community through its species, so the apex is
    // a forwarding address for it rather than its home. (A character with no
    // species has no community and stays here -- see `CharacterHostGuard`.)
    await page.goto(`/character/${world.characters.plain.id}`);

    await expect(page).toHaveURL(world.characters.plain.url);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: world.characters.plain.name,
      }),
    ).toBeVisible();
  });

  test("a subdomain no community holds says so", async ({ page }) => {
    // The wildcard DNS record answers for every label, so a typo or a deleted
    // community reaches the app exactly as a real one does. The app loaded
    // fine; there is simply nothing here, which is a page and not an error.
    await page.goto(communityUrl("nowhere-at-all"));

    await expect(
      page.getByRole("heading", { level: 1, name: "No community here" }),
    ).toBeVisible();
    await expect(communityNav(page)).toHaveCount(0);
  });
});

test.describe("one session across hosts", () => {
  test.use({ persona: "anon" });

  test("signing in at the apex signs you in on a community host", async ({
    page,
    world,
  }) => {
    // Driven through the real form rather than seeded, because the thing under
    // test is what the SERVER sets: a cookie on the parent domain, which the
    // browser then attaches to the API call a community page makes. Seeding it
    // would assume the answer.
    await page.goto("/login");
    await page.getByLabel("Email").fill(world.users.member.email);
    await page.getByLabel("Password").fill(world.users.member.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).not.toHaveURL(/\/login/);

    // A different origin, and nothing was carried across it: the access token
    // was in memory and is gone, and `localStorage` is per-origin and empty.
    // The session survives only because the cookie is not tied to a host.
    await page.goto(world.community.url);

    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Login" })).toHaveCount(0);
  });
});
