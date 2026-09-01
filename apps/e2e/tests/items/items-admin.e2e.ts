import { presetTest, expect, acceptNextDialog } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";
import {
  ItemTransactionKind,
  SeedItemTransactionsDocument,
  SeedItemTypesDocument,
  SeedRevokeItemsDocument,
  SeedGrantItemDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

/**
 * The staff surface for item types: create, edit, delete, and grant.
 *
 * This page had no coverage at all before the ledger work, which is how the
 * stacking-field removal and the `grantItem` return-shape change went in
 * unverified.
 */

const adminUrl = (communityId: string) =>
  `/communities/${communityId}/admin/items`;

/** Keys off the item type id, so it asserts identity rather than presence. */
const card = (page: Page, itemTypeId: string) =>
  page.locator(
    `[data-testid="item-type-card"][data-item-type-id="${itemTypeId}"]`,
  );

// All three modals stay mounted and are hidden with display:none, so a label
// like "Name *" matches in both the create and the edit form. Ids disambiguate.
const field = (page: Page, id: string) => page.locator(`#${id}`);

test.describe("as staff who can manage items", () => {
  test.use({ persona: "quartermaster" });

  // Each test writes item types, so they cannot share the per-file snapshot.
  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("lists the seeded item types with their properties", async ({
    page,
    world,
  }) => {
    await page.goto(adminUrl(world.community.id));

    await expect(
      page.getByRole("heading", { name: "Item Types Administration" }),
    ).toBeVisible();
    await expect(card(page, world.itemTypes.potion.id)).toBeVisible();
    await expect(card(page, world.itemTypes.locket.id)).toBeVisible();

    await expect(card(page, world.itemTypes.potion.id)).toContainText(
      "Tradeable",
    );
    await expect(card(page, world.itemTypes.potion.id)).toContainText(
      "Consumable",
    );

    // Stacking is gone from the model, so no badge may claim otherwise.
    await expect(page.getByText("Stackable")).toHaveCount(0);
    await expect(page.getByText(/Max:/)).toHaveCount(0);
  });

  test("reports circulation and holders per item type", async ({
    page,
    world,
  }) => {
    await page.goto(adminUrl(world.community.id));

    // `member` holds three potions: three in circulation, one holder. The page
    // used to say neither, which is the whole point of this table.
    const potion = card(page, world.itemTypes.potion.id);
    await expect(potion).toContainText("3");

    // The preset's 30 imported lockets are held by one person.
    const locket = card(page, world.itemTypes.locket.id);
    await expect(locket).toContainText("30");
  });

  test("summarises the community above the table", async ({ page, world }) => {
    await page.goto(adminUrl(world.community.id));

    // Scoped to the tiles: "Unclaimed" is also a column header below.
    const tiles = page.getByTestId("economy-tiles");
    await expect(tiles).toContainText("In circulation");
    await expect(tiles).toContainText("Holders");
    await expect(tiles).toContainText("Unclaimed");
    await expect(tiles).toContainText("Net 30d");

    // 3 potions + 30 imported lockets + 2 coin tickets + 1 blank ticket,
    // held by member and othermember.
    await expect(tiles).toContainText("36");
    await expect(tiles).toContainText("2");
  });

  test("a revoke moves the numbers", async ({ page, world }) => {
    await page.goto(adminUrl(world.community.id));
    await expect(card(page, world.itemTypes.potion.id)).toContainText("3");

    await world.as("quartermaster").gql(SeedRevokeItemsDocument, {
      itemIds: world.grantedItems.ids.slice(0, 2),
      reason: "Returned by the member",
    });

    await page.reload();
    // Circulation counts live items only, so two fewer.
    await expect(card(page, world.itemTypes.potion.id)).toContainText("1");
  });

  test("creates an item type", async ({ page, world }) => {
    await page.goto(adminUrl(world.community.id));
    await page.getByRole("button", { name: "Create Item Type" }).click();

    await field(page, "create-item-name").fill("Festival Token");
    await field(page, "create-item-category").fill("Event");

    // The form must offer no stacking controls -- they describe nothing the
    // database does any more.
    await expect(page.getByRole("checkbox", { name: "Stackable" })).toHaveCount(
      0,
    );
    await expect(page.locator("#create-item-maxStackSize")).toHaveCount(0);

    await page.getByRole("button", { name: "Create", exact: true }).click();

    const created = page
      .locator('[data-testid="item-type-card"]')
      .filter({ hasText: "Festival Token" });
    await expect(created).toBeVisible();
    await expect(created).toContainText("Event");
  });

  test("edits an item type", async ({ page, world }) => {
    await page.goto(adminUrl(world.community.id));

    await card(page, world.itemTypes.locket.id)
      .getByRole("button", { name: "Edit" })
      .click();

    const name = field(page, "edit-item-name");
    await expect(name).toHaveValue(world.itemTypes.locket.name);
    await name.fill("Heirloom Locket (Retired)");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(card(page, world.itemTypes.locket.id)).toContainText(
      "Heirloom Locket (Retired)",
    );
  });

  test("refuses to delete an item type that still has items", async ({
    page,
    world,
  }) => {
    await page.goto(adminUrl(world.community.id));

    // The potion has three live items from the seeded grant. Deleting the type
    // would orphan them, so the server refuses and the card survives.
    acceptNextDialog(page);
    await card(page, world.itemTypes.potion.id)
      .getByRole("button", { name: "Delete" })
      .click();

    await expect(card(page, world.itemTypes.potion.id)).toBeVisible();
  });

  test("deletes an item type that has no items", async ({ page, world }) => {
    await page.goto(adminUrl(world.community.id));
    await page.getByRole("button", { name: "Create Item Type" }).click();
    await field(page, "create-item-name").fill("Disposable Type");
    await page.getByRole("button", { name: "Create", exact: true }).click();

    const disposable = page
      .locator('[data-testid="item-type-card"]')
      .filter({ hasText: "Disposable Type" });
    await expect(disposable).toBeVisible();

    acceptNextDialog(page);
    await disposable.getByRole("button", { name: "Delete" }).click();

    await expect(disposable).toHaveCount(0);
  });

  test("grants items, and each unit becomes its own item", async ({
    page,
    world,
  }) => {
    await page.goto(adminUrl(world.community.id));

    await card(page, world.itemTypes.locket.id)
      .getByRole("button", { name: "Grant" })
      .click();

    // Scoped to the grant modal's own typeahead: /search/i alone also matches
    // the sidebar's hidden "Search communities..." box.
    await page.getByPlaceholder("Search for a user...").fill("othermember");
    // Typeahead results are buttons, not listbox options.
    await page
      .getByRole("button", {
        name: new RegExp(world.users.othermember.username),
      })
      .first()
      .click();
    await field(page, "grant-item-quantity").fill("2");
    await page.getByRole("button", { name: "Grant Item" }).click();

    // The grant is only real once the ledger says so. Two units means two
    // items and two rows sharing one batch -- the return-shape change from
    // Item to [Item] is what this pins.
    await expect(async () => {
      const { itemTransactions } = await world
        .as("quartermaster")
        .gql(SeedItemTransactionsDocument, {
          filters: {
            communityId: world.community.id,
            itemTypeId: world.itemTypes.locket.id,
            kinds: [ItemTransactionKind.Grant],
            limit: 100,
          },
        });

      expect(itemTransactions.total).toBe(2);
      expect(
        new Set(itemTransactions.transactions.map((t) => t.batchId)).size,
      ).toBe(1);
      expect(
        new Set(itemTransactions.transactions.map((t) => t.itemId)).size,
      ).toBe(2);
    }).toPass({ timeout: 15_000 });
  });

  test("a grant above the cap is refused and creates nothing", async ({
    world,
  }) => {
    // The cap used to be 9,999. Items do not stack, so that many is that many
    // rows in `items` and in the ledger, then all of them rendered in an
    // inventory -- a staff member granting a thousand watched it hang and
    // pressed the button again (#291).
    await expect(
      world.as("quartermaster").gql(SeedGrantItemDocument, {
        input: {
          itemTypeId: world.itemTypes.locket.id,
          userId: world.users.member.userId,
          quantity: 101,
          reason: "Over the cap",
        },
      }),
    ).rejects.toThrow();

    // Refused whole: a partial grant would be worse than none, since the
    // ledger would then disagree with what was asked for.
    const { itemTransactions } = await world
      .as("quartermaster")
      .gql(SeedItemTransactionsDocument, {
        filters: {
          communityId: world.community.id,
          itemTypeId: world.itemTypes.locket.id,
          kinds: [ItemTransactionKind.Grant],
          limit: 100,
        },
      });
    expect(
      itemTransactions.transactions.some((t) => t.reason === "Over the cap"),
    ).toBe(false);
  });
});

test.describe("as a member without item permissions", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("cannot create an item type through the page", async ({
    page,
    world,
  }) => {
    await page.goto(adminUrl(world.community.id));

    // The route itself is not permission-gated, so the page renders. What must
    // not happen is a member writing through it. Asserted on the outcome
    // rather than on the error copy, which is a server implementation detail.
    await page.getByRole("button", { name: "Create Item Type" }).click();
    await field(page, "create-item-name").fill("Should Not Exist");
    await page.getByRole("button", { name: "Create", exact: true }).click();

    await expect(
      page
        .locator('[data-testid="item-type-card"]')
        .filter({ hasText: "Should Not Exist" }),
    ).toHaveCount(0);

    const { itemTypes } = await world
      .as("quartermaster")
      .gql(SeedItemTypesDocument, {
        filters: { communityId: world.community.id, limit: 100 },
      });
    expect(itemTypes.itemTypes.map((t) => t.name)).not.toContain(
      "Should Not Exist",
    );
  });
});
