import { BadRequestException } from "@nestjs/common";

/**
 * A reorder that does not name every row of the list exactly once. The list
 * changed under the caller (a row was added or deleted since it loaded), or it
 * named a row from somewhere else; either way no order is written.
 */
export class ReorderMismatchError extends BadRequestException {
  constructor(
    readonly expectedCount: number,
    readonly receivedCount: number,
  ) {
    super("The new order must list every item exactly once");
    this.name = new.target.name;
  }
}

/**
 * Each id with its new position, sorted by id rather than by position.
 *
 * Two reorders of one list can run at once (two quick taps on a move button).
 * Each locks every row it updates, and if they update in list order, two
 * different orders take the same locks in different sequences and deadlock.
 * Updating in id order makes every reorder take them in the same sequence, so
 * the second simply waits for the first.
 */
export function positionsInLockOrder(
  orderedIds: readonly string[],
): { id: string; position: number }[] {
  return orderedIds
    .map((id, position) => ({ id, position }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Throws unless `orderedIds` is a permutation of `existingIds`. */
export function assertCompleteReorder(
  orderedIds: readonly string[],
  existingIds: readonly string[],
): void {
  const existing = new Set(existingIds);
  const ordered = new Set(orderedIds);
  const complete =
    ordered.size === orderedIds.length &&
    ordered.size === existing.size &&
    orderedIds.every((id) => existing.has(id));
  if (!complete) {
    throw new ReorderMismatchError(existingIds.length, orderedIds.length);
  }
}
