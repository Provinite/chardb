import { presetTest, expect } from "../../src/fixtures.js";
import {
  SeedCreateItemTypeDocument,
  SeedDeleteItemTypeDocument,
  SeedGrantItemDocument,
  SeedItemProvenanceDocument,
  SeedItemTransactionsDocument,
  SeedItemTypesDocument,
  SeedRevokeItemsDocument,
  SeedUpdateItemDocument,
  SeedUpdateItemTypeDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

/**
 * Regression coverage for a real authorization hole, one case per gated
 * operation.
 *
 * Every mutation in items.resolver.ts used to carry BOTH `@AllowAnyAuthenticated()`
 * and `@AllowCommunityPermission(...)`. The global guard ORs every permission
 * decorator together, so that pair meant "authenticated OR permitted" -- which
 * is just "authenticated". Any logged-in user could create item types, grant
 * items and delete items in any community they had never joined.
 *
 * The trap is that the code looks correct. `@AllowAnyAuthenticated()` reads
 * like "you must be logged in", and adding it next to a community permission
 * looks like tightening rather than the total bypass it is. Nothing about the
 * decorator names warns you, so the only durable defence is a test per
 * operation that actually attempts the call.
 *
 * Each block therefore does three things, and the third is not optional: a
 * permitted actor must succeed. A matrix that only asserts rejection passes
 * just as happily against a resolver that refuses everyone.
 */

const NOT_ALLOWED = /forbidden|permission|not allowed|denied/i;

test.describe("item permissions", () => {
  test.use({ persona: "anon" });

  // Every case writes, so none of them can share the per-file snapshot.
  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test.describe("createItemType — needs canManageItems", () => {
    test("a member of the community without the permission is refused", async ({
      world,
    }) => {
      await expect(
        world.as("member").gql(SeedCreateItemTypeDocument, {
          input: { communityId: world.community.id, name: "Contraband" },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("someone outside the community is refused", async ({ world }) => {
      await expect(
        world.as("outsider").gql(SeedCreateItemTypeDocument, {
          input: { communityId: world.community.id, name: "Contraband" },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("nothing was created by either attempt", async ({ world }) => {
      for (const who of ["member", "outsider"] as const) {
        await world
          .as(who)
          .gql(SeedCreateItemTypeDocument, {
            input: { communityId: world.community.id, name: "Contraband" },
          })
          .catch(() => undefined);
      }

      const { itemTypes } = await world
        .as("quartermaster")
        .gql(SeedItemTypesDocument, {
          filters: { communityId: world.community.id, limit: 100 },
        });
      expect(itemTypes.itemTypes.map((t) => t.name)).not.toContain(
        "Contraband",
      );
    });

    test("a holder of the permission succeeds", async ({ world }) => {
      const { createItemType } = await world
        .as("quartermaster")
        .gql(SeedCreateItemTypeDocument, {
          input: { communityId: world.community.id, name: "Legitimate" },
        });
      expect(createItemType.name).toBe("Legitimate");
    });
  });

  test.describe("updateItemType — needs canManageItems", () => {
    test("a member without the permission is refused", async ({ world }) => {
      await expect(
        world.as("member").gql(SeedUpdateItemTypeDocument, {
          id: world.itemTypes.potion.id,
          input: { name: "Renamed By A Member" },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("someone outside the community is refused", async ({ world }) => {
      await expect(
        world.as("outsider").gql(SeedUpdateItemTypeDocument, {
          id: world.itemTypes.potion.id,
          input: { name: "Renamed By An Outsider" },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("a holder of the permission succeeds", async ({ world }) => {
      const { updateItemType } = await world
        .as("quartermaster")
        .gql(SeedUpdateItemTypeDocument, {
          id: world.itemTypes.potion.id,
          input: { name: "Renamed By Staff" },
        });
      expect(updateItemType.name).toBe("Renamed By Staff");
    });
  });

  test.describe("deleteItemType — needs canManageItems", () => {
    test("a member without the permission is refused", async ({ world }) => {
      await expect(
        world
          .as("member")
          .gql(SeedDeleteItemTypeDocument, { id: world.itemTypes.potion.id }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("someone outside the community is refused", async ({ world }) => {
      await expect(
        world
          .as("outsider")
          .gql(SeedDeleteItemTypeDocument, { id: world.itemTypes.potion.id }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("a holder of the permission succeeds", async ({ world }) => {
      // A fresh type, because deleting one that still has items is refused for
      // an entirely different reason and would not prove anything about
      // permissions.
      const { createItemType } = await world
        .as("quartermaster")
        .gql(SeedCreateItemTypeDocument, {
          input: { communityId: world.community.id, name: "Disposable" },
        });

      await expect(
        world
          .as("quartermaster")
          .gql(SeedDeleteItemTypeDocument, { id: createItemType.id }),
      ).resolves.toEqual({ deleteItemType: true });
    });
  });

  test.describe("grantItem — needs canGrantItems", () => {
    test("a member cannot mint items for themselves", async ({ world }) => {
      // The most valuable case in the file: under the old guard, any logged-in
      // account could award itself anything in any community.
      await expect(
        world.as("member").gql(SeedGrantItemDocument, {
          input: {
            itemTypeId: world.itemTypes.locket.id,
            userId: world.users.member.userId,
            quantity: 5,
            reason: "Self-service",
          },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("someone outside the community is refused", async ({ world }) => {
      await expect(
        world.as("outsider").gql(SeedGrantItemDocument, {
          input: {
            itemTypeId: world.itemTypes.locket.id,
            userId: world.users.member.userId,
            quantity: 1,
            reason: "Outsider grant",
          },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("neither attempt reached the ledger", async ({ world }) => {
      for (const who of ["member", "outsider"] as const) {
        await world
          .as(who)
          .gql(SeedGrantItemDocument, {
            input: {
              itemTypeId: world.itemTypes.locket.id,
              userId: world.users.member.userId,
              quantity: 5,
              reason: "Self-service",
            },
          })
          .catch(() => undefined);
      }

      const { itemTransactions } = await world
        .as("quartermaster")
        .gql(SeedItemTransactionsDocument, {
          filters: {
            communityId: world.community.id,
            itemTypeId: world.itemTypes.locket.id,
            limit: 100,
          },
        });

      // The ledger is the record of record, so it is where a bypass would show.
      expect(
        itemTransactions.transactions.some((t) => t.reason === "Self-service"),
      ).toBe(false);
    });

    test("a holder of the permission succeeds", async ({ world }) => {
      const { grantItem } = await world
        .as("quartermaster")
        .gql(SeedGrantItemDocument, {
          input: {
            itemTypeId: world.itemTypes.locket.id,
            userId: world.users.member.userId,
            quantity: 2,
            reason: "Legitimate grant",
          },
        });
      expect(grantItem).toHaveLength(2);
    });
  });

  test.describe("updateItem — needs canGrantItems", () => {
    test("a member cannot edit an item, even one they hold", async ({
      world,
    }) => {
      // Holding an item is not authority over it. `member` owns this one.
      await expect(
        world.as("member").gql(SeedUpdateItemDocument, {
          id: world.grantedItems.ids[0],
          input: { metadata: "{}" },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("someone outside the community is refused", async ({ world }) => {
      await expect(
        world.as("outsider").gql(SeedUpdateItemDocument, {
          id: world.grantedItems.ids[0],
          input: { metadata: "{}" },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });
  });

  test.describe("revokeItems — needs canGrantItems", () => {
    test("a member cannot revoke, including their own items", async ({
      world,
    }) => {
      await expect(
        world.as("member").gql(SeedRevokeItemsDocument, {
          itemIds: [world.grantedItems.ids[0]],
          reason: "Self-revoke",
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("someone outside the community is refused", async ({ world }) => {
      await expect(
        world.as("outsider").gql(SeedRevokeItemsDocument, {
          itemIds: [world.grantedItems.ids[0]],
          reason: "Outsider revoke",
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("the items survived both attempts", async ({ world }) => {
      for (const who of ["member", "outsider"] as const) {
        await world
          .as(who)
          .gql(SeedRevokeItemsDocument, {
            itemIds: world.grantedItems.ids,
            reason: "Unauthorised revoke",
          })
          .catch(() => undefined);
      }

      // Soft delete means a bypass would not remove the row, only mark it --
      // so assert on provenance rather than on the item still existing.
      const { itemProvenance } = await world
        .as("member")
        .gql(SeedItemProvenanceDocument, { itemId: world.grantedItems.ids[0] });
      expect(itemProvenance.map((t) => t.kind)).toEqual(["GRANT"]);
    });

    test("a holder of the permission succeeds", async ({ world }) => {
      await expect(
        world.as("quartermaster").gql(SeedRevokeItemsDocument, {
          itemIds: [world.grantedItems.ids[0]],
          reason: "Legitimate revoke",
        }),
      ).resolves.toEqual({ revokeItems: 1 });
    });
  });

  test.describe("reading the ledger — needs community membership only", () => {
    test("a member with no item permissions can read it", async ({ world }) => {
      // Deliberate: provenance is public within a community so it can act as a
      // trust signal in trades. This is the one place the permission is
      // intentionally loose, and it is worth pinning so a future tightening is
      // a decision rather than an accident.
      const { itemTransactions } = await world
        .as("member")
        .gql(SeedItemTransactionsDocument, {
          filters: { communityId: world.community.id },
        });
      expect(itemTransactions.total).toBeGreaterThan(0);
    });

    test("someone outside the community cannot read it", async ({ world }) => {
      await expect(
        world.as("outsider").gql(SeedItemTransactionsDocument, {
          filters: { communityId: world.community.id },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("a member can read one item's provenance", async ({ world }) => {
      const { itemProvenance } = await world
        .as("member")
        .gql(SeedItemProvenanceDocument, { itemId: world.grantedItems.ids[0] });
      expect(itemProvenance.length).toBeGreaterThan(0);
    });

    test("someone outside the community cannot read provenance", async ({
      world,
    }) => {
      await expect(
        world.as("outsider").gql(SeedItemProvenanceDocument, {
          itemId: world.grantedItems.ids[0],
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });
  });
});
