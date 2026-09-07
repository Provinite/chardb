/**
 * Tree arithmetic over a flat list of folders.
 *
 * Every one of these takes the owner's whole workspace as an array and works
 * in memory. That is deliberate: a person has tens of folders, `MAX_FOLDERS
 * _PER_OWNER` caps it at 200, and a recursive CTE for a list that small buys
 * nothing but a query nobody can read. Everything here is pure, so the rules
 * that are easy to get wrong -- ancestor visibility, cycles, counting a
 * character once when it sits in two sub-folders of the same parent -- are
 * testable without a database.
 */

/** The subset of a folder row this file needs. */
export interface FolderNode {
  id: string;
  parentId: string | null;
  name: string;
  isPrivate: boolean;
  sortOrder: number;
}

/** Folders by id, for walking parent links. */
export function indexById<T extends FolderNode>(
  folders: readonly T[],
): Map<string, T> {
  return new Map(folders.map((folder) => [folder.id, folder]));
}

/** Child folders by parent id, with the root's under the `null` key. */
export function indexByParent<T extends FolderNode>(
  folders: readonly T[],
): Map<string | null, T[]> {
  const byParent = new Map<string | null, T[]>();
  for (const folder of folders) {
    const siblings = byParent.get(folder.parentId);
    if (siblings) {
      siblings.push(folder);
    } else {
      byParent.set(folder.parentId, [folder]);
    }
  }
  return byParent;
}

/**
 * Order siblings the way the browser draws them.
 *
 * `sortOrder` first, then name. Nothing has a `sortOrder` until somebody drags
 * a folder, so an untouched workspace is alphabetical without a second column
 * to record that it is.
 */
export function compareFolders(a: FolderNode, b: FolderNode): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name);
}

/**
 * The chain from a folder up to the root, nearest parent first.
 *
 * Stops if it ever revisits a folder. Cycles are refused at write time, so
 * this cannot happen -- but an infinite loop in a read path is a worse way to
 * find out about a bug than a short answer is.
 */
export function ancestorsOf<T extends FolderNode>(
  folder: T,
  byId: ReadonlyMap<string, T>,
): T[] {
  const chain: T[] = [];
  const seen = new Set<string>([folder.id]);

  let parentId = folder.parentId;
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent || seen.has(parent.id)) break;
    chain.push(parent);
    seen.add(parent.id);
    parentId = parent.parentId;
  }

  return chain;
}

/** How deep a folder sits, counting the root level as 1. */
export function depthOf<T extends FolderNode>(
  folder: T,
  byId: ReadonlyMap<string, T>,
): number {
  return ancestorsOf(folder, byId).length + 1;
}

/** Every folder beneath one, not including the folder itself. */
export function descendantIds<T extends FolderNode>(
  folderId: string,
  byParent: ReadonlyMap<string | null, T[]>,
): Set<string> {
  const found = new Set<string>();
  const queue = [folderId];

  while (queue.length > 0) {
    const current = queue.pop();
    if (current === undefined) break;
    for (const child of byParent.get(current) ?? []) {
      if (found.has(child.id)) continue;
      found.add(child.id);
      queue.push(child.id);
    }
  }

  return found;
}

/**
 * How many levels a folder's subtree occupies, itself included.
 *
 * A leaf is 1. Needed when moving a folder: the subtree travels with it, so
 * the check is against the deepest thing inside it rather than the folder.
 */
export function subtreeHeight<T extends FolderNode>(
  folderId: string,
  byParent: ReadonlyMap<string | null, T[]>,
): number {
  let height = 1;
  let level = byParent.get(folderId) ?? [];

  while (level.length > 0) {
    height += 1;
    level = level.flatMap((folder) => byParent.get(folder.id) ?? []);
  }

  return height;
}

/**
 * Whether a viewer who is not the owner may see a folder.
 *
 * Private hides the whole subtree, not just the folder. Otherwise a public
 * folder under a private one would be listed with no path leading to it, and
 * its position would describe the parent the owner was hiding.
 */
export function isVisibleToVisitor<T extends FolderNode>(
  folder: T,
  byId: ReadonlyMap<string, T>,
): boolean {
  if (folder.isPrivate) return false;
  return ancestorsOf(folder, byId).every((ancestor) => !ancestor.isPrivate);
}

/**
 * Roll direct membership up into subtree totals.
 *
 * Unions sets rather than adding counts, because a character filed in both
 * `Commissions/2024` and `Commissions/2025` is one character in
 * `Commissions` -- adding would report two and a parent would end up claiming
 * more characters than the owner has.
 */
export function rollUpCounts<T extends FolderNode>(
  folders: readonly T[],
  byId: ReadonlyMap<string, T>,
  directMembers: ReadonlyMap<string, ReadonlySet<string>>,
): Map<string, number> {
  const subtreeMembers = new Map<string, Set<string>>(
    folders.map((folder) => [folder.id, new Set<string>()]),
  );

  for (const folder of folders) {
    const members = directMembers.get(folder.id);
    if (!members || members.size === 0) continue;

    // Into the folder itself and every ancestor: one pass per folder that
    // actually holds something, rather than a walk down from every node.
    for (const target of [folder, ...ancestorsOf(folder, byId)]) {
      const into = subtreeMembers.get(target.id);
      if (!into) continue;
      for (const characterId of members) into.add(characterId);
    }
  }

  return new Map(
    [...subtreeMembers].map(([id, members]) => [id, members.size]),
  );
}
