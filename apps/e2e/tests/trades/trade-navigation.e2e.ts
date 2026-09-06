import { presetTest, expect } from "../../src/fixtures.js";
import { urlStartingWith } from "../../src/config.js";

const test = presetTest("community-items");

/**
 * Which sidebar a trade page leaves you looking at.
 *
 * The navigation reads the HOSTNAME now. `Layout` sits outside `Routes`, so it
 * can never call `useParams()`, and it used to answer "which community am I
 * in?" by matching `location.pathname` against a list of patterns -- which made
 * the shape of a URL a load-bearing part of the navigation and left
 * `/trades?community=<id>` in a community the sidebar could not see (#293).
 * `CommunityHostProvider` reads the hostname instead, before the router has
 * decided anything, so the question has an answer on every page of a community
 * host and no answer at all at the apex (#339).
 *
 * What these specs protect is therefore not a regex any more but the split
 * itself: a community's own inbox is on the community's host and comes with
 * community navigation, the cross-community inbox is at the apex and comes with
 * global navigation, and following the links between them keeps that true. Both
 * inboxes still exist because "everything waiting on me" and "this community's
 * offers" are different questions; a later tidy-up that collapses them would
 * take the first one away.
 */
test.describe("trade pages and community context", () => {
  test.use({ persona: "member" });

  /**
   * Both sidebars are an `<aside role="navigation">` told apart only by their
   * accessible name, so the role is the selector. There is no `<navigation>`
   * element to match on.
   */
  const communityNav = (page: import("@playwright/test").Page) =>
    page.getByRole("navigation", { name: "Community navigation" });
  const globalNav = (page: import("@playwright/test").Page) =>
    page.getByRole("navigation", { name: "Global navigation" });

  test("the community inbox keeps you in community nav", async ({
    page,
    world,
  }) => {
    await page.goto(`${world.community.url}/trades`);

    await expect(communityNav(page)).toBeVisible();
    await expect(page.getByTestId("trade-scope")).toContainText(
      world.community.name,
    );
  });

  test("the community sidebar's own Trades link lands there", async ({
    page,
    world,
  }) => {
    await page.goto(`${world.community.url}/members`);

    // The sequence a member actually hits: click Trades in the community
    // sidebar, and see whether the sidebar you clicked it in is still there.
    await communityNav(page).getByRole("link", { name: "Trades" }).click();

    await expect(page).toHaveURL(`${world.community.url}/trades`);
    await expect(communityNav(page)).toBeVisible();
  });

  test("the cross-community inbox stays on global nav", async ({ page }) => {
    // Relative, so it resolves against the apex `baseURL` -- which is the
    // point: this inbox belongs to the person, not to any one community.
    await page.goto("/trades");

    await expect(globalNav(page)).toBeVisible();
    await expect(page.getByTestId("trade-scope")).toHaveCount(0);
  });

  test("an offer opened from the inbox keeps community nav", async ({
    page,
    world,
  }) => {
    await page.goto(
      `${world.community.url}/trades/new?with=${world.users.othermember.userId}`,
    );
    await page.getByLabel(/hollow coin you give$/i).fill("25");
    await page.getByTestId("send-offer").click();
    await page.waitForURL(/\/trades\/[0-9a-f-]{36}$/);

    // Sending lands on the offer, and the offer is on the community's host
    // rather than adrift of it.
    await expect(page).toHaveURL(
      urlStartingWith(`${world.community.url}/trades/`),
    );
    await expect(communityNav(page)).toBeVisible();

    // And the same holds arriving the other way, from the cross-community
    // list at the apex: a row links through the trade's own community, which
    // now means it crosses hosts.
    await page.goto("/trades");
    await page.getByTestId("trade-row").first().click();
    await expect(page).toHaveURL(
      urlStartingWith(`${world.community.url}/trades/`),
    );
    await expect(communityNav(page)).toBeVisible();
  });
});
