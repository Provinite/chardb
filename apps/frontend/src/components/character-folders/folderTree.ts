import type { CharacterFolderFieldsFragment } from "../../generated/graphql";

export type Folder = CharacterFolderFieldsFragment;

/**
 * The folders directly inside one, in the order the server sorted them.
 *
 * Order is the server's: `(sortOrder, name)`. Re-sorting here would put the
 * browser and the rest of the app on two different opinions about what
 * alphabetical means, and the server's is the one the drag writes back to.
 */
export function childrenOf(
  folders: readonly Folder[],
  parentId: string | null,
): Folder[] {
  return folders.filter((folder) => folder.parentId === parentId);
}

/**
 * The chain from the root down to a folder, that folder last.
 *
 * Empty at the root, which is what the breadcrumb wants -- "My Characters"
 * alone with nothing after it.
 */
export function pathTo(
  folders: readonly Folder[],
  folderId: string | null,
): Folder[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const chain: Folder[] = [];
  const seen = new Set<string>();

  let current = folderId ? byId.get(folderId) : undefined;
  while (current && !seen.has(current.id)) {
    chain.unshift(current);
    seen.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return chain;
}

/**
 * A folder and everything under it, for greying out the destinations a folder
 * cannot be moved into.
 */
export function subtreeIds(
  folders: readonly Folder[],
  folderId: string,
): Set<string> {
  const found = new Set<string>([folderId]);
  const queue = [folderId];

  while (queue.length > 0) {
    const current = queue.pop();
    if (current === undefined) break;
    for (const child of childrenOf(folders, current)) {
      if (found.has(child.id)) continue;
      found.add(child.id);
      queue.push(child.id);
    }
  }

  return found;
}

/**
 * Every folder as one indented list, depth-first, for the picker.
 *
 * A picker needs the whole tree at once -- you file into a folder you are not
 * currently looking at -- so it flattens rather than navigating.
 */
export function flattenTree(
  folders: readonly Folder[],
): Array<{ folder: Folder; depth: number }> {
  const rows: Array<{ folder: Folder; depth: number }> = [];

  const walk = (parentId: string | null, depth: number): void => {
    for (const folder of childrenOf(folders, parentId)) {
      rows.push({ folder, depth });
      walk(folder.id, depth + 1);
    }
  };

  walk(null, 0);
  return rows;
}
