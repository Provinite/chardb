import { presetTest, expect } from "../../src/fixtures.js";
import {
  SeedCreateCommunityDocument,
  SeedRemoveCommunityDocument,
} from "../../src/generated/graphql.js";
import { apexUrl, communityUrl, urlStartingWith } from "../../src/config.js";

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
const communityNav = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Community navigation" });
const globalNav = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Global navigation" });

test.describe("community hosts", () => {
  test.use({ persona: "member" });

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

  test("navigating within a community does not reload the page", async ({
    page,
    world,
  }) => {
    // Splitting hosts made every cross-scope link absolute, and an absolute
    // href reloads the whole app even when it points at the origin it is
    // already on -- which a community's own roster always does. The router has
    // to keep those.
    await page.goto(`${world.community.url}/characters`);

    // Survives a client-side navigation and does not survive a page load.
    await page.evaluate(() => {
      (window as unknown as { __stillHere?: true }).__stillHere = true;
    });

    await page
      .locator(`a[href$="/character/${world.characters.plain.id}"]`)
      .first()
      .click();

    await expect(page).toHaveURL(world.characters.plain.url);
    await expect(
      page.evaluate(
        () => (window as unknown as { __stillHere?: true }).__stillHere,
      ),
    ).resolves.toBe(true);
  });

  test("a subdomain no community holds goes to the apex", async ({ page }) => {
    // The wildcard DNS record answers for every label, so a typo or a deleted
    // community reaches the app exactly as a real one does. There is nothing
    // there and nothing worth saying about it, so it becomes the front page.
    await page.goto(communityUrl("nowhere-at-all"));

    await expect(page).toHaveURL(apexUrl("/"));
    await expect(communityNav(page)).toHaveCount(0);
    await expect(globalNav(page)).toBeVisible();
  });

  test("a label that could never be a slug goes to the apex too", async ({
    page,
  }) => {
    // Same destination by a different route: `ab` is too short to be a slug, so
    // it resolves to no community rather than to one that is missing. Both are
    // addresses nobody meant to type, and used to behave differently -- this
    // one quietly served the whole apex site under the wrong hostname.
    await page.goto(communityUrl("ab"));

    await expect(page).toHaveURL(apexUrl("/"));
    await expect(globalNav(page)).toBeVisible();
  });

  test("remembers which community the host is, between page loads", async ({
    page,
    world,
  }) => {
    // A slug is chosen at creation and never changes, and an id never changes,
    // so this mapping has exactly one answer for all time. Asking the server
    // for it on every page load is a question already answered.
    await page.goto(world.community.url);
    await expect(communityNav(page)).toBeVisible();

    const remembered = await page.evaluate(
      (slug) => window.localStorage.getItem(`chardb.community.${slug}`),
      world.community.slug,
    );
    expect(remembered).not.toBeNull();
    expect(JSON.parse(remembered as string).id).toBe(world.community.id);
  });

  test("a community that gets deleted stops working gracefully", async ({
    page,
    world,
  }) => {
    // The host remembers which community it is, so that a return visit renders
    // without waiting on a lookup. That memory must not outlive the community:
    // without forgetting it, the app keeps rendering community pages against a
    // dead id and never decides the address is unknown, so the host stays
    // broken rather than bouncing.
    //
    // Its own community rather than the preset's, because it ends up deleted.
    const slug = `ephemeral-${Date.now()}`;
    const { createCommunity } = await world
      .as("siteadmin")
      .gql(SeedCreateCommunityDocument, {
        createCommunityInput: { name: `Ephemeral ${Date.now()}`, slug },
      });

    // Visited first, so the host is remembered the way the app does it rather
    // than the way a test could fake it.
    await page.goto(communityUrl(slug));
    await expect(page).toHaveURL(urlStartingWith(communityUrl(slug)));

    await world
      .as("siteadmin")
      .gql(SeedRemoveCommunityDocument, { id: createCommunity.id });

    await page.goto(communityUrl(slug));

    await expect(page).toHaveURL(apexUrl("/"));
    await expect(globalNav(page)).toBeVisible();
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

  test("signing in from a community host comes back to it", async ({
    page,
    world,
  }) => {
    // Signing in has to happen at the apex -- that is where the cookie for the
    // whole parent domain is set -- but leaving a community should not be a
    // one-way trip. Router state cannot carry the way back, because the trip
    // crosses an ORIGIN and `location.state` does not survive that; the return
    // address has to be in the URL.
    //
    // A PUBLIC community page, because this is the journey that starts by
    // clicking Login rather than by being bounced there: somewhere a signed-out
    // visitor can actually stand and see the button.
    await page.goto(`${world.community.url}/characters`);

    await page.getByRole("button", { name: "Login" }).click();

    // Anchored on the APEX login page, not any `/login`. The community host has
    // one too -- it is the hop that sends you here -- and filling the form on
    // that one races the redirect and loses what was typed.
    await expect(page).toHaveURL(urlStartingWith(apexUrl("/login")));

    await page.getByLabel("Email").fill(world.users.member.email);
    await page.getByLabel("Password").fill(world.users.member.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Back where they started, not stranded on the apex dashboard.
    await expect(page).toHaveURL(`${world.community.url}/characters`);
    await expect(communityNav(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  });

  test("a signed-out visitor to a protected community page returns to it", async ({
    page,
    world,
  }) => {
    // The same journey, entered by URL rather than by clicking: ProtectedRoute
    // bounces to /login, which on a community host is itself a hop to the
    // apex. Two redirects, and the destination has to survive both.
    await page.goto(`${world.community.url}/settings`);

    await expect(page).toHaveURL(urlStartingWith(apexUrl("/login")));
    await page.getByLabel("Email").fill(world.users.commadmin.email);
    await page.getByLabel("Password").fill(world.users.commadmin.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(`${world.community.url}/settings`);
  });

  test("a forged return address is ignored", async ({ page, world }) => {
    // The return address is attacker-controllable, and the reason it is two
    // parameters rather than one URL is that a foreign origin then has nowhere
    // to go: `nextCommunitySlug` is checked by the rule that decides what a
    // community may be called, and the destination is built from it rather
    // than taken as given. Both halves are tried here.
    await page.goto(
      `${apexUrl("/login")}?nextCommunitySlug=evil.example&nextPath=${encodeURIComponent("//evil.example/phish")}`,
    );

    await page.getByLabel("Email").fill(world.users.member.email);
    await page.getByLabel("Password").fill(world.users.member.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).not.toHaveURL(/evil\.example/);
    await expect(page).toHaveURL(apexUrl("/dashboard"));
  });
});
