import { presetTest, expect } from "../../src/fixtures.js";
import {
  ItemTransactionKind,
  SeedGrantItemDocument,
  SeedItemProvenanceDocument,
  SeedItemTransactionsDocument,
  SeedRevokeItemsDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

// Every test here mutates items, so they cannot share the per-file snapshot.
test.beforeEach(async ({ world }) => {
  await world.reset();
});

test.describe("writes reach the ledger", () => {
  test.use({ persona: "member" });

  test("a revoke appears on the ledger, and the grant survives it", async ({
    page,
    world,
  }) => {
    await world.as("quartermaster").gql(SeedRevokeItemsDocument, {
      itemIds: world.grantedItems.ids,
      reason: "Issued in error during the Lanternfall payout",
    });

    await page.goto(world.community.ledgerUrl);

    const revoked = page
      .getByRole("row")
      .filter({ hasText: "Trait Change Potion" })
      .filter({ hasText: "Revoked" });

    // Three items revoked in one call collapse to a single line reading −3.
    await expect(revoked).toHaveCount(1);
    await expect(revoked).toContainText("−3");
    await expect(revoked).toContainText("destroyed");
    await expect(revoked).toContainText(
      "Issued in error during the Lanternfall payout",
    );

    // The original grant is still there. An append-only ledger never loses the
    // earlier half of the story.
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: "Trait Change Potion" })
        .filter({ hasText: "Granted" }),
    ).toHaveCount(1);
  });

  test("revoking part of a holding leaves the rest alone", async ({
    page,
    world,
  }) => {
    // Two of the three. Per-instance rows are what make this expressible at
    // all -- under a quantity column there would be no way to name which two.
    const [first, second] = world.grantedItems.ids;

    await world.as("quartermaster").gql(SeedRevokeItemsDocument, {
      itemIds: [first, second],
      reason: "Two returned after the tier correction",
    });

    await page.goto(world.community.ledgerUrl);

    const revoked = page
      .getByRole("row")
      .filter({ hasText: "Two returned after the tier correction" });

    await expect(revoked).toHaveCount(1);
    await expect(revoked).toContainText("−2");
  });

  test("a second grant is its own event, not a merge into the first", async ({
    page,
    world,
  }) => {
    await world.as("quartermaster").gql(SeedGrantItemDocument, {
      input: {
        itemTypeId: world.itemTypes.potion.id,
        userId: world.users.member.userId,
        quantity: 2,
        reason: "Hollowtide week three",
      },
    });

    await page.goto(world.community.ledgerUrl);

    await expect(
      page.getByRole("row").filter({ hasText: "Hollowtide week three" }),
    ).toContainText("+2");

    // Two separate grant lines, not one line of five. Each batch is an event.
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: "Trait Change Potion" })
        .filter({ hasText: "Granted" }),
    ).toHaveCount(2);
  });
});

test.describe("the inventory collapses what the ledger separates", () => {
  test.use({ persona: "member" });

  test("three items show as one tile reading x3", async ({ page, world }) => {
    await page.goto(`${world.community.url}/inventory`);

    const tile = page
      .getByRole("link")
      .filter({ hasText: world.itemTypes.potion.name });

    // One tile, not three: stacking is a presentation choice now.
    await expect(tile).toHaveCount(1);
    await expect(tile).toContainText("×3");
  });

  test("revoked items leave the inventory", async ({ page, world }) => {
    // One of three, so the tile stays and the count drops. Revoking down to a
    // single item would remove the badge entirely, which would pass for the
    // wrong reason.
    await world.as("quartermaster").gql(SeedRevokeItemsDocument, {
      itemIds: world.grantedItems.ids.slice(0, 1),
      reason: "Returned by the member",
    });

    await page.goto(`${world.community.url}/inventory`);

    await expect(
      page.getByRole("link").filter({ hasText: world.itemTypes.potion.name }),
    ).toContainText("×2");
  });
});

test.describe("the API contract behind the page", () => {
  test.use({ persona: "anon" });

  test("a grant of three returns three items and writes three rows", async ({
    world,
  }) => {
    const { itemTransactions } = await world
      .as("member")
      .gql(SeedItemTransactionsDocument, {
        filters: {
          communityId: world.community.id,
          kinds: [ItemTransactionKind.Grant],
          limit: 100,
        },
      });

    expect(world.grantedItems.ids).toHaveLength(3);
    expect(itemTransactions.total).toBe(3);

    // One row per item, all sharing one batch id -- the exact key the frontend
    // groups on to render "Granted +3" as a single line.
    const batchIds = new Set(
      itemTransactions.transactions.map((t) => t.batchId),
    );
    expect(batchIds.size).toBe(1);
    const itemIds = new Set(itemTransactions.transactions.map((t) => t.itemId));
    expect(itemIds).toEqual(new Set(world.grantedItems.ids));
  });

  test("each item carries its own provenance", async ({ world }) => {
    const [first] = world.grantedItems.ids;

    await world.as("quartermaster").gql(SeedRevokeItemsDocument, {
      itemIds: [first],
      reason: "Returned by the member",
    });

    const revokedItem = await world
      .as("member")
      .gql(SeedItemProvenanceDocument, { itemId: first });
    const untouchedItem = await world
      .as("member")
      .gql(SeedItemProvenanceDocument, { itemId: world.grantedItems.ids[1] });

    // The whole point of dropping stacking: these two items were granted
    // together and now have genuinely different histories, and each can say so.
    expect(revokedItem.itemProvenance.map((t) => t.kind)).toEqual([
      ItemTransactionKind.Grant,
      ItemTransactionKind.Revoke,
    ]);
    expect(untouchedItem.itemProvenance.map((t) => t.kind)).toEqual([
      ItemTransactionKind.Grant,
    ]);
  });

  test("a destroyed item keeps its provenance readable", async ({ world }) => {
    const [first] = world.grantedItems.ids;

    await world.as("quartermaster").gql(SeedRevokeItemsDocument, {
      itemIds: [first],
      reason: "Returned by the member",
    });

    // Soft delete is what makes this work. A hard delete would take the
    // history with it, exactly when a dispute would want to read it.
    const { itemProvenance } = await world
      .as("member")
      .gql(SeedItemProvenanceDocument, { itemId: first });

    expect(itemProvenance).toHaveLength(2);
    expect(itemProvenance[1].reason).toBe("Returned by the member");
  });

  test("a revoke spanning two item types is refused", async ({ world }) => {
    const { grantItem: lockets } = await world
      .as("quartermaster")
      .gql(SeedGrantItemDocument, {
        input: {
          itemTypeId: world.itemTypes.locket.id,
          userId: world.users.member.userId,
          quantity: 1,
          reason: "Founding member recognition",
        },
      });

    // One ledger event names one item type. Mixing them is two events, and the
    // service says so rather than silently attributing both to one type.
    await expect(
      world.as("quartermaster").gql(SeedRevokeItemsDocument, {
        itemIds: [world.grantedItems.ids[0], lockets[0].id],
        reason: "Mixed revoke",
      }),
    ).rejects.toThrow();
  });

  test("a non-member cannot read the ledger", async ({ world }) => {
    await expect(
      world.as("outsider").gql(SeedItemTransactionsDocument, {
        filters: { communityId: world.community.id },
      }),
    ).rejects.toThrow();
  });

  test("staffNote is null for a member and present for staff", async ({
    world,
  }) => {
    const filters = {
      communityId: world.community.id,
      kinds: [ItemTransactionKind.Grant],
    };

    const asMember = await world
      .as("member")
      .gql(SeedItemTransactionsDocument, { filters });
    const asStaff = await world
      .as("quartermaster")
      .gql(SeedItemTransactionsDocument, { filters });

    // Same rows, same query, two viewers. Asserted at the API rather than only
    // through the page so a future consumer cannot pick the note up by
    // querying the field directly.
    expect(asMember.itemTransactions.transactions[0].staffNote).toBeNull();
    expect(asMember.itemTransactions.transactions[0].reason).toBe(
      "Lanternfall prompt completion",
    );
    expect(asStaff.itemTransactions.transactions[0].staffNote).toBe(
      "Bumped from 1 after the tier table turned out ambiguous",
    );
  });
});
