import { presetTest, expect } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";
import {
  SeedGrantItemDocument,
  SeedItemDocument,
  SeedRevokeItemsDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

/** One entry in the history timeline. */
const events = (page: Page) => page.getByTestId("provenance-event");
const eventOfKind = (page: Page, kind: string) =>
  page.locator(`[data-testid="provenance-event"][data-kind="${kind}"]`);

/** An inventory tile, keyed by item type so it asserts identity. */
const tile = (page: Page, itemTypeId: string) =>
  page.locator(
    `[data-testid="inventory-tile"][data-item-type-id="${itemTypeId}"]`,
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
    await page.goto(`/items/${world.grantedItems.ids[0]}`);

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
    await page.goto(`/items/${world.grantedItems.ids[0]}`);

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
    await page.goto(`/items/${world.importedItems.ids[0]}`);

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

    await page.goto(`/items/${world.grantedItems.ids[0]}`);

    // A history reads forwards. The ledger is a feed and reads backwards.
    await expect(events(page)).toHaveCount(2);
    await expect(events(page).first()).toHaveAttribute("data-kind", "GRANT");
    await expect(events(page).last()).toHaveAttribute("data-kind", "REVOKE");
  });
});

test.describe("staff", () => {
  test.use({ persona: "quartermaster" });

  test("sees the staff note on the same page", async ({ page, world }) => {
    await page.goto(`/items/${world.grantedItems.ids[0]}`);

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

    await page.goto(`/items/${world.grantedItems.ids[0]}`);

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
    await expect(tile(page, world.itemTypes.potion.id)).toHaveCount(0);

    await page.goto(`/items/${world.grantedItems.ids[0]}`);
    await expect(page.getByTestId("item-destroyed-banner")).toBeVisible();
  });
});

test.describe("someone outside the community", () => {
  test.use({ persona: "outsider" });

  test("cannot read an item's history", async ({ page, world }) => {
    await page.goto(`/items/${world.grantedItems.ids[0]}`);

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
    await page.goto(`/item-types/${world.itemTypes.potion.id}`);
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
    await page.goto(`/item/${world.itemTypes.potion.id}`);

    await expect(page).toHaveURL(
      new RegExp(`/item-types/${world.itemTypes.potion.id}$`),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Trait Change Potion" }),
    ).toBeVisible();
  });

  test("a single-item tile links to the item, a grouped one to the type", async ({
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

    // Three potions do not share a history, so the tile cannot point at any
    // single one of them and falls back to the catalogue entry.
    await expect(tile(page, world.itemTypes.potion.id)).toHaveAttribute(
      "href",
      `/item-types/${world.itemTypes.potion.id}`,
    );

    // One locket has one history, so it links straight to it.
    await expect(tile(page, world.itemTypes.locket.id)).toHaveAttribute(
      "href",
      `/items/${grantItem[0].id}`,
    );

    await tile(page, world.itemTypes.locket.id).click();
    await expect(page.getByTestId("item-status")).toContainText(
      `Held by ${world.users.member.username}`,
    );
  });
});
