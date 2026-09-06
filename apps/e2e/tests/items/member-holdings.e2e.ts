import { presetTest, expect } from "../../src/fixtures.js";
import { urlStartingWith } from "../../src/config.js";
import type { Page } from "@playwright/test";
const test = presetTest("community-items");

/**
 * One page, three audiences.
 *
 * Inventories are public within a community, so a member looking at themselves,
 * someone sizing up a trade partner, and staff about to correct something all
 * see the same facts. Permissions add actions; they never change what is shown.
 */

/** Both take the community's own origin -- `world.community.url` -- because
 *  these pages are served from the community's host, not from the apex. */
const ownUrl = (communityUrl: string) => `${communityUrl}/inventory`;

const memberUrl = (communityUrl: string, username: string) =>
  `${communityUrl}/members/${username}/items`;

const group = (page: Page, itemTypeId: string) =>
  page.locator(
    `[data-testid="holding-group"][data-item-type-id="${itemTypeId}"]`,
  );

test.describe("viewing your own inventory", () => {
  test.use({ persona: "member" });

  test("groups items by type with a count", async ({ page, world }) => {
    await page.goto(ownUrl(world.community.url));

    await expect(
      page.getByRole("heading", { level: 1, name: "Your Inventory" }),
    ).toBeVisible();

    const potion = group(page, world.itemTypes.potion.id);
    await expect(potion).toContainText("Trait Change Potion");
    await expect(potion).toContainText("×3");
  });

  test("offers no revoke controls on your own items", async ({
    page,
    world,
  }) => {
    // `member` has no item permissions, and this is their own inventory --
    // neither reason to show a revoke applies.
    await page.goto(ownUrl(world.community.url));

    const potion = group(page, world.itemTypes.potion.id);
    await potion.getByTestId("expand-group").click();

    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(page.getByTestId("selection-bar")).toHaveCount(0);
  });
});

test.describe("a holding larger than the old page size", () => {
  test.use({ persona: "member" });

  test("shows every item, not the first twenty", async ({ page, world }) => {
    // The bug this page replaces: User.inventories took the default limit of
    // 20 and reported the truncated length as the total, so a holder of 30
    // saw 20 and was told that was all of them. `othermember` holds the
    // preset's 30 imported lockets.
    expect(world.importedItems.count).toBeGreaterThan(20);

    await page.goto(
      memberUrl(world.community.url, world.users.othermember.username),
    );

    const lockets = group(page, world.itemTypes.locket.id);
    await expect(lockets).toContainText(`×${world.importedItems.count}`);

    await lockets.getByTestId("expand-group").click();
    await expect(lockets.getByTestId("holding-item")).toHaveCount(
      world.importedItems.count,
    );
  });

  test("each item links to its own history", async ({ page, world }) => {
    await page.goto(ownUrl(world.community.url));

    const potion = group(page, world.itemTypes.potion.id);
    await potion.getByTestId("expand-group").click();

    const first = potion.getByTestId("holding-item").first();
    // A path, not a URL: the item is on the community host this page is
    // already on, so the link stays inside the router rather than naming an
    // origin. The community is the host now, so it is no longer in the path.
    await expect(first.getByRole("link")).toHaveAttribute(
      "href",
      /^\/items\/[0-9a-f-]{36}$/,
    );
  });
});

test.describe("viewing another member", () => {
  test.use({ persona: "othermember" });

  test("shows the same facts about someone else", async ({ page, world }) => {
    // Public within the community: this is what makes a trade partner's
    // inventory checkable before offering.
    await page.goto(
      memberUrl(world.community.url, world.users.member.username),
    );

    await expect(
      page.getByRole("heading", { level: 1, name: /Items$/ }),
    ).toContainText(world.users.member.username);
    await expect(group(page, world.itemTypes.potion.id)).toContainText("×3");
  });

  test("offers no revoke without the permission", async ({ page, world }) => {
    await page.goto(
      memberUrl(world.community.url, world.users.member.username),
    );

    const potion = group(page, world.itemTypes.potion.id);
    await potion.getByTestId("expand-group").click();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
  });
});

test.describe("staff have no actions here", () => {
  test.use({ persona: "quartermaster" });

  test("holdings offer no revoke, even with the permission", async ({
    page,
    world,
  }) => {
    // Deliberate: revoking happens on an item's own page, where its history is
    // in front of you. You should not be able to take something away without
    // first looking at what it is and where it came from.
    await page.goto(
      memberUrl(world.community.url, world.users.member.username),
    );

    const potion = group(page, world.itemTypes.potion.id);
    await potion.getByTestId("expand-group").click();

    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(page.getByTestId("selection-bar")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /revoke/i })).toHaveCount(0);
  });

  test("an item links through to where revoking happens", async ({
    page,
    world,
  }) => {
    await page.goto(
      memberUrl(world.community.url, world.users.member.username),
    );

    const potion = group(page, world.itemTypes.potion.id);
    await potion.getByTestId("expand-group").click();
    await potion.getByTestId("holding-item").first().getByRole("link").click();

    await expect(page).toHaveURL(
      urlStartingWith(`${world.community.url}/items/`),
    );
    // The revoke control lives here, next to the history.
    await expect(page.getByTestId("revoke-item")).toBeVisible();
  });
});

test.describe("someone outside the community", () => {
  test.use({ persona: "outsider" });

  test("cannot read a member's holdings", async ({ page, world }) => {
    await page.goto(
      memberUrl(world.community.url, world.users.member.username),
    );

    await expect(page.getByText("could not be loaded")).toBeVisible();
    await expect(group(page, world.itemTypes.potion.id)).toHaveCount(0);
  });
});

test.describe("reaching holdings from the member list", () => {
  test.use({ persona: "member" });

  test("lists everyone in the community with their role", async ({
    page,
    world,
  }) => {
    await page.goto(`${world.community.url}/members`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Members" }),
    ).toBeVisible();

    // The preset puts three people in the community; commadmin created it, so
    // four in total. outsider is deliberately not one of them.
    const rows = page.getByTestId("member-row");
    await expect(rows).toHaveCount(4);
    await expect(
      page.locator(
        `[data-testid="member-row"][data-username="${world.users.member.username}"]`,
      ),
    ).toContainText("Member");
    await expect(
      page.locator(
        `[data-testid="member-row"][data-username="${world.users.quartermaster.username}"]`,
      ),
    ).toContainText("Quartermaster");
  });

  test("clicking a member's Items reaches their holdings", async ({
    page,
    world,
  }) => {
    // The whole reason this page exists: before it, holdings were reachable
    // only by typing a URL.
    await page.goto(`${world.community.url}/members`);

    await page
      .locator(
        `[data-testid="member-row"][data-username="${world.users.othermember.username}"]`,
      )
      .getByRole("link", { name: /Items/ })
      .click();

    await expect(page).toHaveURL(
      memberUrl(world.community.url, world.users.othermember.username),
    );
    await expect(group(page, world.itemTypes.locket.id)).toContainText(
      `×${world.importedItems.count}`,
    );
  });

  test("search narrows the list", async ({ page, world }) => {
    await page.goto(`${world.community.url}/members`);

    await page
      .getByRole("searchbox", { name: "Search members" })
      .fill(world.users.quartermaster.username);

    await expect(page.getByTestId("member-row")).toHaveCount(1);
  });
});
