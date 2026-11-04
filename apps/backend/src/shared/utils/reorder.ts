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
