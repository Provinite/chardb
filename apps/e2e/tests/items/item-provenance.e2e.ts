import { presetTest, expect } from "../../src/fixtures.js";
import { communityUrl } from "../../src/config.js";
import type { Page } from "@playwright/test";
import {
  SeedCreateCommunityDocument,
  SeedGrantItemDocument,
  SeedItemDocument,
  SeedRevokeItemsDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

/** One entry in the history timeline. */
const events = (page: Page) => page.getByTestId("provenance-event");
const eventOfKind = (page: Page, kind: string) =>
  page.locator(`[data-testid="provenance-event"][data-kind="${kind}"]`);

/** The item page is community-scoped, so it is served from the community's own
 *  host and renders inside community nav. Takes `world.community.url`. */
const itemUrl = (communityHome: string, itemId: string) =>
  `${communityHome}/items/${itemId}`;

/** An inventory holding group, keyed by item type so it asserts identity. */
const group = (page: Page, itemTypeId: string) =>
  page.locator(
    `[data-testid="holding-group"][data-item-type-id="${itemTypeId}"]`,
  );

/**
 * One item's history page.
 *
 * This is what the public-provenance decision was actually for: the ledger
 * shows a community's firehose, but nothing showed a single object's story
 * until this page. The API shipped a release before the UI did.
 */

test.describe("as a member with no item permissions", () => {
  test.use({ persona: "member" });

  test("shows the item, its holder, and its history", async ({
    page,
    world,
  }) => {
    await page.goto(itemUrl(world.community.url, world.grantedItems.ids[0]));

    await expect(
      page.getByRole("heading", { level: 1, name: "Trait Change Potion" }),
    ).toBeVisible();
    await expect(
      page.getByText(`Held by ${world.users.member.username}`),
    ).toBeVisible();

    const granted = eventOfKind(page, "GRANT");
    await expect(granted).toHaveCount(1);
    await expect(granted).toContainText(
      `Granted to ${world.users.member.username}`,
    );
    await expect(granted).toContainText("Lanternfall prompt completion");
  });

  test("does not show the staff note", async ({ page, world }) => {
    await page.goto(itemUrl(world.community.url, world.grantedItems.ids[0]));

    await expect(page.getByText("Lanternfall prompt completion")).toBeVisible();
    await expect(
      page.getByText("Bumped from 1 after the tier table turned out ambiguous"),
    ).toHaveCount(0);
  });

  test("an imported item says its origin was never recorded", async ({
    page,
    world,
  }) => {
    // The dominant row type in a real ledger. It must not read as a grant from
    // nobody -- these items have a real history that simply was not captured.
    await page.goto(itemUrl(world.community.url, world.importedItems.ids[0]));

    const imported = eventOfKind(page, "IMPORT");
    await expect(imported).toHaveCount(1);
    await expect(imported).toContainText(
      "Already held when the ledger was introduced",
    );
  });

  test("reads oldest first, unlike the ledger", async ({ page, world }) => {
    await world.as("quartermaster").gql(SeedRevokeItemsDocument, {
      itemIds: [world.grantedItems.ids[0]],
      reason: "Returned by the member",
    });

    await page.goto(itemUrl(world.community.url, world.grantedItems.ids[0]));

    // A history reads forwards. The ledger is a feed and reads backwards.
    await expect(events(page)).toHaveCount(2);
    await expect(events(page).first()).toHaveAttribute("data-kind", "GRANT");
    await expect(events(page).last()).toHaveAttribute("data-kind", "REVOKE");
  });
});

test.describe("staff", () => {
  test.use({ persona: "quartermaster" });

  test("sees the staff note on the same page", async ({ page, world }) => {
    await page.goto(itemUrl(world.community.url, world.grantedItems.ids[0]));

    await expect(
      page.getByText("Bumped from 1 after the tier table turned out ambiguous"),
    ).toBeVisible();
  });
});

test.describe("a destroyed item", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("still resolves, and says so", async ({ page, world }) => {
    // The entire point of revoking softly: the history a dispute needs is
    // exactly the history a hard delete would have taken with it.
    await world.as("quartermaster").gql(SeedRevokeItemsDocument, {
      itemIds: [world.grantedItems.ids[0]],
      reason: "Issued in error",
    });

    await page.goto(itemUrl(world.community.url, world.grantedItems.ids[0]));

    const banner = page.getByTestId("item-destroyed-banner");
    await expect(banner).toContainText("This item was destroyed");
    await expect(banner).toContainText("Issued in error");
    await expect(page.getByTestId("item-status")).toContainText(
      "No longer in circulation",
    );
    await expect(eventOfKind(page, "REVOKE")).toContainText("Issued in error");
  });

  test("is gone from the inventory but its page still works", async ({
    page,
    world,
  }) => {
    await world.as("quartermaster").gql(SeedRevokeItemsDocument, {
      itemIds: world.grantedItems.ids,
      reason: "Issued in error",
    });

    await page.goto(`${world.community.url}/inventory`);
    await expect(group(page, world.itemTypes.potion.id)).toHaveCount(0);

    await page.goto(itemUrl(world.community.url, world.grantedItems.ids[0]));
    await expect(page.getByTestId("item-destroyed-banner")).toBeVisible();
  });
});

test.describe("someone outside the community", () => {
  test.use({ persona: "outsider" });

  test("cannot read an item's history", async ({ page, world }) => {
    await page.goto(itemUrl(world.community.url, world.grantedItems.ids[0]));

    await expect(page.getByText("could not be loaded")).toBeVisible();
    await expect(page.getByText("Lanternfall prompt completion")).toHaveCount(
      0,
    );
  });

  test("nor through the API", async ({ world }) => {
    await expect(
      world.as("outsider").gql(SeedItemDocument, {
        id: world.grantedItems.ids[0],
      }),
    ).rejects.toThrow(/forbidden|permission|not allowed|denied/i);
  });
});

test.describe("item URLs", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("the catalogue entry lives at /item-types/:id", async ({
    page,
    world,
  }) => {
    await page.goto(
      `${world.community.url}/item-types/${world.itemTypes.potion.id}`,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Trait Change Potion" }),
    ).toBeVisible();
  });

  test("the legacy /item/:id redirects rather than duplicating the page", async ({
    page,
    world,
  }) => {
    // Added in a0a2e5a to fix a broken external link. Kept as a redirect so
    // there is one canonical URL rather than two that render the same thing.
    await page.goto(`${world.community.url}/item/${world.itemTypes.potion.id}`);

    await expect(page).toHaveURL(
      `${world.community.url}/item-types/${world.itemTypes.potion.id}`,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Trait Change Potion" }),
    ).toBeVisible();
  });

  test("a single item is reachable without expanding anything", async ({
    page,
    world,
  }) => {
    // One locket on top of the three potions `member` already holds, so the
    // page shows both shapes at once.
    const { grantItem } = await world
      .as("quartermaster")
      .gql(SeedGrantItemDocument, {
        input: {
          itemTypeId: world.itemTypes.locket.id,
          userId: world.users.member.userId,
          quantity: 1,
          reason: "Founding member recognition",
        },
      });

    await page.goto(`${world.community.url}/inventory`);

    // A group of three needs opening -- the three do not share a history, so
    // there is no single item for the group itself to point at.
    const potions = group(page, world.itemTypes.potion.id);
    await expect(potions.getByTestId("expand-group")).toBeVisible();
    await expect(potions.getByTestId("holding-item")).toHaveCount(0);

    // A group of one has nothing to collapse, so its item is already there.
    const lockets = group(page, world.itemTypes.locket.id);
    await expect(lockets.getByTestId("expand-group")).toHaveCount(0);
    await expect(
      lockets.getByTestId("holding-item").getByRole("link"),
      // A path, not a URL: the item's page is on this same community host, so
      // the link never names an origin.
    ).toHaveAttribute("href", `/items/${grantItem[0].id}`);

    await lockets.getByTestId("holding-item").getByRole("link").click();
    await expect(page.getByTestId("item-status")).toContainText(
      `Held by ${world.users.member.username}`,
    );
  });
});

test.describe("chain of custody and facts", () => {
  test.use({ persona: "member" });

  test("names the current holder and the item's own facts", async ({
    page,
    world,
  }) => {
    await page.goto(itemUrl(world.community.url, world.grantedItems.ids[0]));

    const custody = page.getByTestId("chain-of-custody");
    await expect(custody).toContainText(world.users.member.username);
    await expect(custody).toContainText("since");

    const facts = page.getByTestId("item-facts");
    await expect(facts).toContainText("Granted");
    await expect(facts).toContainText(world.community.name);
    // Trait Change Potion is tradeable and consumable in the preset.
    await expect(facts).toContainText("Tradeable");
    await expect(facts).toContainText("Consumable");
  });

  test("an imported item reports that it predates the ledger", async ({
    page,
    world,
  }) => {
    await page.goto(itemUrl(world.community.url, world.importedItems.ids[0]));

    await expect(page.getByTestId("item-facts")).toContainText(
      "Predates the ledger",
    );
  });

  test("an item opened on another community's host moves to its own", async ({
    page,
    world,
  }) => {
    // The permission check resolves the community from the item, so the wrong
    // host is not a security hole -- it would just frame the page with the
    // wrong community's navigation. The correction is a change of ORIGIN now,
    // which is why the page does it with a whole-page navigation rather than
    // the router.
    const { createCommunity: elsewhere } = await world
      .as("commadmin")
      .gql(SeedCreateCommunityDocument, {
        createCommunityInput: {
          name: "Distant Marsh",
          slug: "distant-marsh",
        },
      });

    await page.goto(
      communityUrl(elsewhere.slug, `/items/${world.grantedItems.ids[0]}`),
    );

    await expect(page).toHaveURL(
      itemUrl(world.community.url, world.grantedItems.ids[0]),
    );
  });
});

test.describe("revoking from the item page", () => {
  test.use({ persona: "quartermaster" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("staff can revoke, and the page reflects it", async ({
    page,
    world,
  }) => {
    await page.goto(itemUrl(world.community.url, world.grantedItems.ids[0]));

    await page.getByTestId("revoke-item").click();
    await page
      .getByLabel("Reason (shown to members)")
      .fill("Issued in error during the payout");
    await page.getByLabel("Staff note (private)").fill("Bot retried after 502");
    await page.getByTestId("confirm-revoke").click();

    await expect(page.getByTestId("item-destroyed-banner")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("item-destroyed-banner")).toContainText(
      "Issued in error during the payout",
    );
    await expect(eventOfKind(page, "REVOKE")).toContainText(
      "Bot retried after 502",
    );
    await expect(page.getByTestId("chain-of-custody")).toContainText(
      "destroyed",
    );
  });

  test("the confirm button stays disabled without a reason", async ({
    page,
    world,
  }) => {
    // The reason is public and required -- it is what the member sees on the
    // item's history afterwards.
    await page.goto(itemUrl(world.community.url, world.grantedItems.ids[1]));

    await page.getByTestId("revoke-item").click();
    await expect(page.getByTestId("confirm-revoke")).toBeDisabled();

    await page.getByLabel("Reason (shown to members)").fill("Returned");
    await expect(page.getByTestId("confirm-revoke")).toBeEnabled();
  });
});

test.describe("a member without item permissions", () => {
  test.use({ persona: "member" });

  test("is not offered a revoke control", async ({ page, world }) => {
    await page.goto(itemUrl(world.community.url, world.grantedItems.ids[0]));

    await expect(page.getByTestId("item-status")).toBeVisible();
    await expect(page.getByTestId("revoke-item")).toHaveCount(0);
  });
});
