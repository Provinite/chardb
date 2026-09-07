import {
  childrenOf,
  flattenTree,
  pathTo,
  subtreeIds,
  Folder,
} from "./folderTree";

function folder(
  id: string,
  parentId: string | null = null,
  overrides: Partial<Folder> = {},
): Folder {
  return {
    __typename: "CharacterFolder",
    id,
    parentId,
    name: id,
    isPrivate: false,
    sortOrder: 0,
    characterCount: 0,
    ...overrides,
  };
}

/**
 * commissions
 *   2024
 *     paid
 * fursonas
 *
 * In server order: `(sortOrder, name)` with every sortOrder still zero.
 */
const folders: Folder[] = [
  folder("commissions"),
  folder("2024", "commissions"),
  folder("paid", "2024"),
  folder("fursonas"),
];

describe("childrenOf", () => {
  it("returns the root folders for a null parent", () => {
    expect(childrenOf(folders, null).map((f) => f.id)).toEqual([
      "commissions",
      "fursonas",
    ]);
  });

  it("keeps the server's order rather than re-sorting", () => {
    const dragged = [
      folder("wip", null, { sortOrder: 1 }),
      folder("art", null, { sortOrder: 2 }),
    ];

    expect(childrenOf(dragged, null).map((f) => f.id)).toEqual(["wip", "art"]);
  });
});

describe("pathTo", () => {
  it("is empty at the root", () => {
    expect(pathTo(folders, null)).toEqual([]);
  });

  it("runs from the root down, with the folder itself last", () => {
    expect(pathTo(folders, "paid").map((f) => f.id)).toEqual([
      "commissions",
      "2024",
      "paid",
    ]);
  });

  it("stops rather than looping if the data contains a cycle", () => {
    const cyclic = [folder("a", "b"), folder("b", "a")];

    expect(pathTo(cyclic, "a").map((f) => f.id)).toEqual(["b", "a"]);
  });
});

describe("subtreeIds", () => {
  it("includes the folder itself", () => {
    expect([...subtreeIds(folders, "commissions")].sort()).toEqual([
      "2024",
      "commissions",
      "paid",
    ]);
  });
});

describe("flattenTree", () => {
  it("walks depth-first and records how deep each folder is", () => {
    expect(
      flattenTree(folders).map(({ folder: f, depth }) => [f.id, depth]),
    ).toEqual([
      ["commissions", 0],
      ["2024", 1],
      ["paid", 2],
      ["fursonas", 0],
    ]);
  });
});
