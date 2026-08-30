import { describe, it, expect } from "vitest";
import {
  groupIntoStacks,
  collapseByBatch,
  chainOfCustody,
} from "../../lib/itemDisplay";
import { ItemTransactionKind } from "../../generated/graphql";
import type { ItemTransactionFieldsFragment } from "../../generated/graphql";

/**
 * Items are stored one row per instance so each can answer for its own
 * provenance. Both of these functions do the other half of that trade: putting
 * the rows back together for display. They are the only place the "three
 * potions look like one tile" illusion is maintained, so they get tested
 * directly rather than only through the pages that call them.
 */

const itemType = (id: string, name: string) =>
  ({
    id,
    name,
    category: null,
    color: null,
    image: null,
  }) as unknown as Parameters<typeof groupIntoStacks>[0][number]["itemType"];

const item = (id: string, typeId: string, typeName: string) =>
  ({ id, itemType: itemType(typeId, typeName) }) as Parameters<
    typeof groupIntoStacks
  >[0][number];

describe("groupIntoStacks", () => {
  it("rolls repeated item types into one tile with a count", () => {
    const stacks = groupIntoStacks([
      item("i1", "potion", "Trait Change Potion"),
      item("i2", "potion", "Trait Change Potion"),
      item("i3", "potion", "Trait Change Potion"),
    ]);

    expect(stacks).toHaveLength(1);
    expect(stacks[0].count).toBe(3);
    expect(stacks[0].itemType.id).toBe("potion");
  });

  it("keeps different item types apart", () => {
    const stacks = groupIntoStacks([
      item("i1", "potion", "Trait Change Potion"),
      item("i2", "locket", "Heirloom Locket"),
      item("i3", "potion", "Trait Change Potion"),
    ]);

    expect(stacks.map((s) => [s.itemType.id, s.count])).toEqual([
      ["potion", 2],
      ["locket", 1],
    ]);
  });

  it("preserves first-seen order so the grid does not reshuffle", () => {
    // A member gaining a second copy of something they already hold must not
    // make the tile jump position.
    const stacks = groupIntoStacks([
      item("i1", "locket", "Heirloom Locket"),
      item("i2", "potion", "Trait Change Potion"),
      item("i3", "locket", "Heirloom Locket"),
    ]);

    expect(stacks.map((s) => s.itemType.id)).toEqual(["locket", "potion"]);
  });

  it("returns nothing for an empty inventory", () => {
    expect(groupIntoStacks([])).toEqual([]);
  });
});

const row = (
  id: string,
  batchId: string,
  batchSize: number,
  kind: ItemTransactionKind = ItemTransactionKind.Grant,
) =>
  ({
    id,
    batchId,
    batchSize,
    kind,
    reason: null,
    staffNote: null,
    actorLabel: null,
    createdAt: "2026-08-30T00:00:00Z",
    itemId: `item-${id}`,
    communityId: "comm1",
    itemType: {
      id: "t1",
      name: "Potion",
      category: null,
      color: null,
      image: null,
    },
    fromUser: null,
    toUser: null,
    actorUser: null,
  }) as unknown as ItemTransactionFieldsFragment;

describe("collapseByBatch", () => {
  it("collapses every row of a batch into one entry", () => {
    const entries = collapseByBatch([
      row("a", "batch1", 3),
      row("b", "batch1", 3),
      row("c", "batch1", 3),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0].count).toBe(3);
  });

  it("reports the whole batch even when the page holds only part of it", () => {
    // The regression this exists for: counting loaded rows would say 2 here,
    // and a real ledger opens on a batch of several hundred against a page
    // size of 25.
    const entries = collapseByBatch([
      row("a", "migration", 403),
      row("b", "migration", 403),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0].count).toBe(403);
  });

  it("keeps separate batches as separate events", () => {
    const entries = collapseByBatch([
      row("a", "batch1", 2),
      row("b", "batch1", 2),
      row("c", "batch2", 1),
    ]);

    expect(entries.map((e) => [e.row.batchId, e.count])).toEqual([
      ["batch1", 2],
      ["batch2", 1],
    ]);
  });

  it("preserves server order, which is newest first", () => {
    const entries = collapseByBatch([
      row("a", "newest", 1),
      row("b", "older", 1),
      row("c", "oldest", 1),
    ]);

    expect(entries.map((e) => e.row.batchId)).toEqual([
      "newest",
      "older",
      "oldest",
    ]);
  });

  it("returns nothing for an empty ledger", () => {
    expect(collapseByBatch([])).toEqual([]);
  });
});

describe("chainOfCustody", () => {
  const holder = (id: string, username: string) =>
    ({ id, username, displayName: null, avatarImage: null }) as NonNullable<
      ItemTransactionFieldsFragment["toUser"]
    >;

  const move = (
    kind: ItemTransactionKind,
    at: string,
    to: ReturnType<typeof holder> | null,
    from: ReturnType<typeof holder> | null = null,
  ) =>
    ({
      ...row("x", `b-${at}`, 1, kind),
      createdAt: at,
      toUser: to,
      fromUser: from,
    }) as ItemTransactionFieldsFragment;

  const alice = holder("a", "alice");
  const bob = holder("b", "bob");

  it("reports a single unbroken run for an item that never moved", () => {
    const spells = chainOfCustody([
      move(ItemTransactionKind.Grant, "2026-01-01T00:00:00Z", alice),
    ]);

    expect(spells).toHaveLength(1);
    expect(spells[0].holder?.username).toBe("alice");
    expect(spells[0].until).toBeNull();
  });

  it("closes one run and opens another when the item changes hands", () => {
    const spells = chainOfCustody([
      move(ItemTransactionKind.Grant, "2026-01-01T00:00:00Z", alice),
      move(ItemTransactionKind.Transfer, "2026-02-01T00:00:00Z", bob, alice),
    ]);

    expect(spells.map((s) => s.holder?.username)).toEqual(["alice", "bob"]);
    expect(spells[0].until).toBe("2026-02-01T00:00:00Z");
    expect(spells[1].until).toBeNull();
  });

  it("treats an unclaimed grant as a run with no holder", () => {
    // The item exists but nobody has it, which is a real state worth showing
    // rather than an absence to skip over.
    const spells = chainOfCustody([
      move(ItemTransactionKind.Grant, "2026-01-01T00:00:00Z", null),
      move(ItemTransactionKind.Claim, "2026-01-05T00:00:00Z", alice),
    ]);

    expect(spells).toHaveLength(2);
    expect(spells[0].holder).toBeNull();
    expect(spells[1].holder?.username).toBe("alice");
  });

  it("does not start a new run for an event that keeps the same hands", () => {
    // A correction that re-states the holder is not a change of custody.
    const spells = chainOfCustody([
      move(ItemTransactionKind.Grant, "2026-01-01T00:00:00Z", alice),
      move(ItemTransactionKind.Grant, "2026-01-02T00:00:00Z", alice),
    ]);

    expect(spells).toHaveLength(1);
    expect(spells[0].since).toBe("2026-01-01T00:00:00Z");
  });

  it("closes the final run when the item is destroyed", () => {
    const spells = chainOfCustody([
      move(ItemTransactionKind.Grant, "2026-01-01T00:00:00Z", alice),
      move(ItemTransactionKind.Revoke, "2026-03-01T00:00:00Z", null, alice),
    ]);

    expect(spells).toHaveLength(1);
    expect(spells[0].until).toBe("2026-03-01T00:00:00Z");
    expect(spells[0].endedByDestruction).toBe(true);
  });

  it("returns nothing for an item with no history", () => {
    expect(chainOfCustody([])).toEqual([]);
  });
});
