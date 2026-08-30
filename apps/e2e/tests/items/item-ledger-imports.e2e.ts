import { presetTest, expect } from "../../src/fixtures.js";
import {
  ItemTransactionKind,
  SeedItemProvenanceDocument,
  SeedItemTransactionsDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

/**
 * IMPORT rows are what the migration writes for every item that already
 * existed, and on day one they will outnumber every other kind several hundred
 * to one. Nothing in the API can create them, so without a seeded batch the
 * most common row in a real ledger would never be rendered by any test.
 */

const importRow = (page: import("@playwright/test").Page) =>
  page.getByRole("row").filter({ hasText: "Imported" });

test.describe("imported rows on the ledger", () => {
  test.use({ persona: "member" });

  test("render as one collapsed line naming the holder", async ({
    page,
    world,
  }) => {
    await page.goto(world.community.ledgerUrl);

    const row = importRow(page);

    // One line, not thirty. The batch is the event.
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("Heirloom Locket");
    await expect(row).toContainText(world.users.othermember.username);
    await expect(row).toContainText("system");
    await expect(row).toContainText(
      "Recorded when the item ledger was introduced",
    );
  });

  test("say the origin is unrecorded rather than implying a grant", async ({
    page,
    world,
  }) => {
    await page.goto(world.community.ledgerUrl);

    // A bare dash would read as "granted by nobody". These items have a real
    // history that simply was not captured, and the row has to say so.
    await expect(importRow(page)).toContainText("unrecorded");
    await expect(importRow(page)).not.toContainText("destroyed");
  });

  test("count the whole batch, not just the rows on this page", async ({
    page,
    world,
  }) => {
    // The regression this exists for. The batch is 30 and the page size is 25,
    // so a count derived from loaded rows would read +25 here. A real ledger
    // opens on a batch of several hundred against the same page size, making
    // the very first thing a user sees the wrong number.
    expect(world.importedItems.count).toBeGreaterThan(25);

    await page.goto(world.community.ledgerUrl);

    await expect(importRow(page)).toContainText(
      `+${world.importedItems.count}`,
    );
  });

  test("filter as their own kind", async ({ page, world }) => {
    await page.goto(world.community.ledgerUrl);

    await page.getByRole("button", { name: "Imported" }).click();

    await expect(importRow(page)).toHaveCount(1);
    // The seeded grant is a different kind and must drop out.
    await expect(
      page.getByRole("row").filter({ hasText: "Trait Change Potion" }),
    ).toHaveCount(0);
  });
});

test.describe("the API behind imported rows", () => {
  test.use({ persona: "anon" });

  test("every imported item carries exactly one IMPORT row", async ({
    world,
  }) => {
    const { itemTransactions } = await world
      .as("member")
      .gql(SeedItemTransactionsDocument, {
        filters: {
          communityId: world.community.id,
          kinds: [ItemTransactionKind.Import],
          limit: 100,
        },
      });

    expect(itemTransactions.total).toBe(world.importedItems.count);

    const batchIds = new Set(
      itemTransactions.transactions.map((t) => t.batchId),
    );
    expect(batchIds).toEqual(new Set([world.importedItems.batchId]));
  });

  test("batchSize reports the whole batch on a partial page", async ({
    world,
  }) => {
    // Same regression as the UI test, asserted at the source: ask for five rows
    // of a thirty-row batch and every one of them still reports thirty.
    const { itemTransactions } = await world
      .as("member")
      .gql(SeedItemTransactionsDocument, {
        filters: {
          communityId: world.community.id,
          kinds: [ItemTransactionKind.Import],
          limit: 5,
        },
      });

    expect(itemTransactions.transactions).toHaveLength(5);
    for (const t of itemTransactions.transactions) {
      expect(t.batchSize).toBe(world.importedItems.count);
    }
  });

  test("an imported item's provenance is a single honest line", async ({
    world,
  }) => {
    const { itemProvenance } = await world
      .as("member")
      .gql(SeedItemProvenanceDocument, {
        itemId: world.importedItems.ids[0],
      });

    // Not empty -- an empty timeline reads to a member as a broken page rather
    // than as missing history -- and not a fabricated GRANT.
    expect(itemProvenance).toHaveLength(1);
    expect(itemProvenance[0].kind).toBe(ItemTransactionKind.Import);
    expect(itemProvenance[0].reason).toContain(
      "Recorded when the item ledger was introduced",
    );
  });
});
