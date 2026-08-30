import { ItemTransactionKind } from "../generated/graphql";
import type {
  ItemFieldsFragment,
  ItemTransactionFieldsFragment,
} from "../generated/graphql";

/**
 * Putting per-instance rows back together for display.
 *
 * Items are stored one row per instance so each can answer for its own
 * provenance — a row whose quantity went 2 → 4 → 3 cannot say which two of the
 * three came from a given trade. These two functions do the other half of that
 * trade: they restore the "three potions look like one tile" reading that
 * members expect, without the database having to lie to provide it.
 *
 * They live here rather than beside the pages that call them so both can be
 * tested directly, and so neither page file exports a non-component.
 */

export interface DisplayStack {
  itemType: ItemFieldsFragment["itemType"];
  count: number;
  /**
   * The first item in the group. Only meaningful when `count` is 1 -- several
   * items do not share a history, so there is no single one to link to.
   */
  itemId: string;
}

/**
 * Rolls per-instance items up by item type for an inventory grid.
 *
 * Insertion order is preserved so the grid does not reshuffle when a member
 * gains a second copy of something they already hold.
 */
export function groupIntoStacks(
  items: readonly ItemFieldsFragment[],
): DisplayStack[] {
  const byType = new Map<string, DisplayStack>();
  for (const item of items) {
    const existing = byType.get(item.itemType.id);
    if (existing) {
      existing.count += 1;
    } else {
      byType.set(item.itemType.id, {
        itemType: item.itemType,
        count: 1,
        itemId: item.id,
      });
    }
  }
  return Array.from(byType.values());
}

export interface LedgerEntry {
  row: ItemTransactionFieldsFragment;
  count: number;
}

/**
 * Collapses one ledger row per item back into one line per event.
 *
 * The count comes from `batchSize`, not from how many rows of the batch happen
 * to be on this page. Those differ constantly — the migration writes one batch
 * per pre-existing item, so a real ledger opens on a batch of several hundred
 * against a page size of 25, and counting loaded rows would show "+25".
 */
export function collapseByBatch(
  rows: readonly ItemTransactionFieldsFragment[],
): LedgerEntry[] {
  const byBatch = new Map<string, LedgerEntry>();
  for (const row of rows) {
    if (!byBatch.has(row.batchId)) {
      byBatch.set(row.batchId, { row, count: row.batchSize });
    }
  }
  return Array.from(byBatch.values());
}

/**
 * How each kind of movement is named and coloured.
 *
 * Shared because the ledger and a single item's history are two views of the
 * same rows, and a "Revoked" pill that is red on one page and amber on the
 * other would read as two different things.
 */
export const KIND_LABEL: Record<ItemTransactionKind, string> = {
  [ItemTransactionKind.Grant]: "Granted",
  [ItemTransactionKind.Revoke]: "Revoked",
  [ItemTransactionKind.Transfer]: "Traded",
  [ItemTransactionKind.Claim]: "Claimed",
  [ItemTransactionKind.Use]: "Used",
  [ItemTransactionKind.Import]: "Imported",
};

/** Semantic tone, resolved against the theme by whichever component renders it. */
export type KindTone = "success" | "danger" | "info" | "warning" | "muted";

export const kindTone = (kind: ItemTransactionKind): KindTone => {
  switch (kind) {
    case ItemTransactionKind.Grant:
      return "success";
    case ItemTransactionKind.Revoke:
      return "danger";
    case ItemTransactionKind.Transfer:
      return "info";
    case ItemTransactionKind.Claim:
      return "warning";
    case ItemTransactionKind.Use:
    case ItemTransactionKind.Import:
    default:
      // Bookkeeping and consumption, not a movement anyone made.
      return "muted";
  }
};
