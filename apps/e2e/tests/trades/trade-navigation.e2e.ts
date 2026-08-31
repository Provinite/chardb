import { presetTest, expect } from "../../src/fixtures.js";

const test = presetTest("community-items");

/**
 * Which sidebar a trade page leaves you looking at.
 *
 * `Layout` sits outside `Routes`, so the navigation cannot call `useParams()`
 * and reads community context off the pathname instead. That makes the shape
 * of a URL a load-bearing part of the navigation rather than a cosmetic
 * choice: `/trades?community=<id>` was in a community the sidebar could not
 * see, and dropped the member to global nav with no way back except the
 * browser's back button (#293).
 *
 * Nothing asserted on the sidebar before this file, which is exactly how that
 * shipped -- the list narrowed correctly, so every test of the list passed.
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

    // The reported bug, in the sequence a member actually hits it: click
    // Trades in the community sidebar, and the sidebar you clicked it in
    // disappears.
    await communityNav(page).getByRole("link", { name: "Trades" }).click();

    await expect(page).toHaveURL(new RegExp(`/communities/[^/]+/trades$`));
    await expect(communityNav(page)).toBeVisible();
  });

  test("the cross-community inbox stays on global nav", async ({ page }) => {
    await page.goto("/trades");

    // Pinned deliberately. Two inboxes exist because "everything waiting on
    // me" and "this community's offers" are different questions, and a later
    // tidy-up that collapses them would take the first one away.
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

    // Sending lands on the offer, and the offer is somewhere inside the
    // community rather than adrift of it.
    await expect(page).toHaveURL(
      new RegExp(`/communities/${world.community.id}/trades/[0-9a-f-]{36}$`),
    );
    await expect(communityNav(page)).toBeVisible();

    // And the same holds arriving the other way, from the cross-community
    // list, because a row links through the trade's own community.
    await page.goto("/trades");
    await page.getByTestId("trade-row").first().click();
    await expect(page).toHaveURL(
      new RegExp(`/communities/${world.community.id}/trades/[0-9a-f-]{36}$`),
    );
    await expect(communityNav(page)).toBeVisible();
  });
});
