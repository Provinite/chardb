import {
  ancestorsOf,
  compareFolders,
  depthOf,
  descendantIds,
  FolderNode,
  indexById,
  indexByParent,
  isVisibleToVisitor,
  rollUpCounts,
  subtreeHeight,
} from "./folder-tree";

function folder(
  id: string,
  parentId: string | null = null,
  overrides: Partial<FolderNode> = {},
): FolderNode {
  return {
    id,
    parentId,
    name: id,
    isPrivate: false,
    sortOrder: 0,
    ...overrides,
  };
}

/**
 * commissions
 *   2024
 *     paid
 *   2025
 * fursonas
 */
const tree: FolderNode[] = [
  folder("commissions"),
  folder("2024", "commissions"),
  folder("paid", "2024"),
  folder("2025", "commissions"),
  folder("fursonas"),
];

describe("compareFolders", () => {
  it("reads alphabetical while every sortOrder is still zero", () => {
    const unordered = [folder("wip"), folder("art"), folder("Retired")];

    expect(unordered.sort(compareFolders).map((f) => f.name)).toEqual([
      "art",
      "Retired",
      "wip",
    ]);
  });

  it("puts an explicit sortOrder ahead of the name", () => {
    const dragged = [
      folder("art", null, { sortOrder: 2 }),
      folder("wip", null, { sortOrder: 1 }),
    ];

    expect(dragged.sort(compareFolders).map((f) => f.name)).toEqual([
      "wip",
      "art",
    ]);
  });
});

describe("ancestorsOf", () => {
  it("walks up to the root, nearest parent first", () => {
    const byId = indexById(tree);
    const paid = byId.get("paid");

    expect(ancestorsOf(paid!, byId).map((f) => f.id)).toEqual([
      "2024",
      "commissions",
    ]);
  });

  it("stops rather than looping if the data ever contains a cycle", () => {
    const cyclic = [folder("a", "b"), folder("b", "a")];
    const byId = indexById(cyclic);

    expect(ancestorsOf(byId.get("a")!, byId).map((f) => f.id)).toEqual(["b"]);
  });
});

describe("depthOf", () => {
  it("counts the root level as 1", () => {
    const byId = indexById(tree);

    expect(depthOf(byId.get("commissions")!, byId)).toBe(1);
    expect(depthOf(byId.get("2024")!, byId)).toBe(2);
    expect(depthOf(byId.get("paid")!, byId)).toBe(3);
  });
});

describe("descendantIds", () => {
  it("finds everything beneath a folder but not the folder itself", () => {
    const byParent = indexByParent(tree);

    expect([...descendantIds("commissions", byParent)].sort()).toEqual([
      "2024",
      "2025",
      "paid",
    ]);
  });

  it("is empty for a leaf", () => {
    expect(descendantIds("fursonas", indexByParent(tree)).size).toBe(0);
  });
});

describe("subtreeHeight", () => {
  it("counts the folder itself, so a leaf is 1", () => {
    expect(subtreeHeight("fursonas", indexByParent(tree))).toBe(1);
  });

  it("measures to the deepest descendant", () => {
    // commissions -> 2024 -> paid
    expect(subtreeHeight("commissions", indexByParent(tree))).toBe(3);
  });
});

describe("isVisibleToVisitor", () => {
  it("hides a private folder", () => {
    const folders = [folder("secret", null, { isPrivate: true })];
    const byId = indexById(folders);

    expect(isVisibleToVisitor(byId.get("secret")!, byId)).toBe(false);
  });

  it("hides a public folder nested inside a private one", () => {
    const folders = [
      folder("secret", null, { isPrivate: true }),
      folder("public-child", "secret"),
    ];
    const byId = indexById(folders);

    expect(isVisibleToVisitor(byId.get("public-child")!, byId)).toBe(false);
  });

  it("shows a public folder whose ancestors are all public", () => {
    const byId = indexById(tree);

    expect(isVisibleToVisitor(byId.get("paid")!, byId)).toBe(true);
  });
});

describe("rollUpCounts", () => {
  const byId = indexById(tree);

  it("adds a child's characters to every ancestor", () => {
    const counts = rollUpCounts(
      tree,
      byId,
      new Map([["paid", new Set(["char-1", "char-2"])]]),
    );

    expect(counts.get("paid")).toBe(2);
    expect(counts.get("2024")).toBe(2);
    expect(counts.get("commissions")).toBe(2);
    expect(counts.get("fursonas")).toBe(0);
  });

  it("counts a character once when two sub-folders of one parent hold it", () => {
    const counts = rollUpCounts(
      tree,
      byId,
      new Map([
        ["2024", new Set(["char-1"])],
        ["2025", new Set(["char-1"])],
      ]),
    );

    // The parent has one character in it, not two.
    expect(counts.get("commissions")).toBe(1);
  });

  it("is zero everywhere when nothing is filed", () => {
    const counts = rollUpCounts(tree, byId, new Map());

    expect([...counts.values()]).toEqual([0, 0, 0, 0, 0]);
  });
});
