import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Visibility } from "@chardb/database";
import { CharacterFoldersService } from "./character-folders.service";
import { DatabaseService } from "../database/database.service";
import { mockDatabaseService } from "../../test/setup";

const OWNER = "owner-1";

interface FolderRow {
  id: string;
  parentId: string | null;
  name: string;
  isPrivate: boolean;
  sortOrder: number;
}

function row(
  id: string,
  parentId: string | null = null,
  overrides: Partial<FolderRow> = {},
): FolderRow {
  return {
    id,
    parentId,
    name: id,
    isPrivate: false,
    sortOrder: 0,
    ...overrides,
  };
}

describe("CharacterFoldersService", () => {
  let service: CharacterFoldersService;
  let db: typeof mockDatabaseService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CharacterFoldersService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get(CharacterFoldersService);
    db = module.get<DatabaseService>(
      DatabaseService,
    ) as unknown as typeof mockDatabaseService;

    db.characterFolderEntry.findMany.mockResolvedValue([]);
  });

  describe("listForOwner", () => {
    it("counts a character once however many sub-folders hold it", async () => {
      db.characterFolder.findMany.mockResolvedValue([
        row("commissions"),
        row("2024", "commissions"),
        row("2025", "commissions"),
      ]);
      db.characterFolderEntry.findMany.mockResolvedValue([
        { folderId: "2024", characterId: "char-1" },
        { folderId: "2025", characterId: "char-1" },
      ]);

      const folders = await service.listForOwner(OWNER, OWNER);

      expect(folders.find((f) => f.id === "commissions")?.characterCount).toBe(
        1,
      );
    });

    it("only counts characters the owner still owns", async () => {
      db.characterFolder.findMany.mockResolvedValue([row("wip")]);

      await service.listForOwner(OWNER, OWNER);

      expect(db.characterFolderEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            character: expect.objectContaining({
              ownerId: OWNER,
              deletedAt: null,
            }),
          }),
        }),
      );
    });

    it("hides a private folder and its public children from a visitor", async () => {
      db.characterFolder.findMany.mockResolvedValue([
        row("secret", null, { isPrivate: true }),
        row("inside", "secret"),
        row("open"),
      ]);

      const folders = await service.listForOwner(OWNER, "someone-else");

      expect(folders.map((f) => f.id)).toEqual(["open"]);
    });

    it("shows the owner their own private folders", async () => {
      db.characterFolder.findMany.mockResolvedValue([
        row("secret", null, { isPrivate: true }),
        row("open"),
      ]);

      const folders = await service.listForOwner(OWNER, OWNER);

      expect(folders.map((f) => f.id).sort()).toEqual(["open", "secret"]);
    });

    it("counts only public characters for a visitor", async () => {
      db.characterFolder.findMany.mockResolvedValue([row("open")]);

      await service.listForOwner(OWNER, "someone-else");

      expect(db.characterFolderEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            character: expect.objectContaining({
              visibility: Visibility.PUBLIC,
            }),
          }),
        }),
      );
    });

    it("narrows the counting to a community without dropping the folder", async () => {
      db.characterFolder.findMany.mockResolvedValue([row("wip")]);

      const folders = await service.listForOwner(OWNER, OWNER, "community-1");

      expect(db.characterFolderEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            character: expect.objectContaining({
              species: { communityId: "community-1" },
            }),
          }),
        }),
      );
      // Still listed, reporting zero, so it can be filed into from in here.
      expect(folders).toHaveLength(1);
      expect(folders[0].characterCount).toBe(0);
    });
  });

  describe("create", () => {
    it("refuses a sibling name that differs only in case", async () => {
      db.characterFolder.findMany.mockResolvedValue([
        row("wip-id", null, { name: "WIP" }),
      ]);

      await expect(service.create(OWNER, { name: "wip" })).rejects.toThrow(
        BadRequestException,
      );
    });

    it("allows the same name under a different parent", async () => {
      db.characterFolder.findMany.mockResolvedValue([
        row("commissions"),
        row("wip-id", null, { name: "WIP" }),
      ]);
      db.characterFolder.create.mockResolvedValue(
        row("new", "commissions", { name: "WIP" }),
      );

      await expect(
        service.create(OWNER, { name: "WIP", parentId: "commissions" }),
      ).resolves.toMatchObject({ name: "WIP" });
    });

    it("refuses to nest deeper than the cap", async () => {
      // A chain already five deep: a new child of the last would be six.
      db.characterFolder.findMany.mockResolvedValue([
        row("l1"),
        row("l2", "l1"),
        row("l3", "l2"),
        row("l4", "l3"),
        row("l5", "l4"),
      ]);

      await expect(
        service.create(OWNER, { name: "l6", parentId: "l5" }),
      ).rejects.toThrow(/nested at most/);
    });

    it("leaves sortOrder at zero while the group is unordered", async () => {
      db.characterFolder.findMany.mockResolvedValue([row("art")]);
      db.characterFolder.create.mockResolvedValue(row("new"));

      await service.create(OWNER, { name: "wip" });

      expect(db.characterFolder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sortOrder: 0 }),
        }),
      );
    });

    it("appends to the end of a group somebody has ordered", async () => {
      db.characterFolder.findMany.mockResolvedValue([
        row("art", null, { sortOrder: 1 }),
        row("retired", null, { sortOrder: 2 }),
      ]);
      db.characterFolder.create.mockResolvedValue(row("new"));

      await service.create(OWNER, { name: "wip" });

      expect(db.characterFolder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sortOrder: 3 }),
        }),
      );
    });

    it("collapses whitespace in the name rather than storing it", async () => {
      db.characterFolder.findMany.mockResolvedValue([]);
      db.characterFolder.create.mockResolvedValue(row("new"));

      await service.create(OWNER, { name: "  open   for  trade " });

      expect(db.characterFolder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "open for trade" }),
        }),
      );
    });
  });

  describe("move", () => {
    beforeEach(() => {
      db.characterFolder.update.mockResolvedValue(row("x"));
    });

    it("refuses to move a folder inside itself", async () => {
      db.characterFolder.findMany.mockResolvedValue([row("a")]);

      await expect(
        service.move(OWNER, { id: "a", parentId: "a" }),
      ).rejects.toThrow(/inside itself/);
    });

    it("refuses to move a folder inside its own descendant", async () => {
      db.characterFolder.findMany.mockResolvedValue([
        row("a"),
        row("b", "a"),
        row("c", "b"),
      ]);

      await expect(
        service.move(OWNER, { id: "a", parentId: "c" }),
      ).rejects.toThrow(/inside itself/);
    });

    it("measures depth against the deepest folder in the subtree", async () => {
      // Moving `a` (which is 3 tall) under `l3` would land `c` at level 6.
      db.characterFolder.findMany.mockResolvedValue([
        row("l1"),
        row("l2", "l1"),
        row("l3", "l2"),
        row("a"),
        row("b", "a"),
        row("c", "b"),
      ]);

      await expect(
        service.move(OWNER, { id: "a", parentId: "l3" }),
      ).rejects.toThrow(/nested at most/);
    });

    it("refuses a move onto a parent that already has that name", async () => {
      db.characterFolder.findMany.mockResolvedValue([
        row("wip-a", null, { name: "WIP" }),
        row("commissions"),
        row("wip-b", "commissions", { name: "wip" }),
      ]);

      await expect(
        service.move(OWNER, { id: "wip-a", parentId: "commissions" }),
      ).rejects.toThrow(/already have a folder/);
    });

    it("renumbers the target group from 1, so it stops being alphabetical", async () => {
      db.characterFolder.findMany.mockResolvedValue([
        row("art"),
        row("retired"),
        row("wip"),
      ]);

      await service.move(OWNER, { id: "wip", index: 0 });

      const ordering = db.characterFolder.update.mock.calls
        .map(([call]) => call as { where: { id: string }; data: unknown })
        .filter((call) => "sortOrder" in (call.data as object))
        .map((call) => [
          call.where.id,
          (call.data as { sortOrder: number }).sortOrder,
        ]);

      expect(ordering).toEqual([
        ["wip", 1],
        ["art", 2],
        ["retired", 3],
      ]);
    });
  });

  describe("moveCharacters", () => {
    beforeEach(() => {
      db.characterFolder.findMany.mockResolvedValue([row("wip"), row("art")]);
      db.characterFolderEntry.groupBy.mockResolvedValue([]);
      db.character.count.mockResolvedValue(2);
    });

    it("refuses the whole call if any character is not yours", async () => {
      db.character.count.mockResolvedValue(1);

      await expect(
        service.moveCharacters(OWNER, {
          characterIds: ["char-1", "char-2"],
          toFolderId: "wip",
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(db.characterFolderEntry.createMany).not.toHaveBeenCalled();
    });

    it("adds without removing when no source folder is given", async () => {
      await service.moveCharacters(OWNER, {
        characterIds: ["char-1", "char-2"],
        toFolderId: "wip",
      });

      expect(db.characterFolderEntry.deleteMany).not.toHaveBeenCalled();
      expect(db.characterFolderEntry.createMany).toHaveBeenCalledWith({
        data: [
          { folderId: "wip", characterId: "char-1" },
          { folderId: "wip", characterId: "char-2" },
        ],
        skipDuplicates: true,
      });
    });

    it("removes from the source when one is given", async () => {
      await service.moveCharacters(OWNER, {
        characterIds: ["char-1", "char-2"],
        fromFolderId: "art",
        toFolderId: "wip",
      });

      expect(db.characterFolderEntry.deleteMany).toHaveBeenCalledWith({
        where: {
          folderId: "art",
          characterId: { in: ["char-1", "char-2"] },
        },
      });
    });

    it("unfiles when the destination is the root", async () => {
      await service.moveCharacters(OWNER, {
        characterIds: ["char-1", "char-2"],
        fromFolderId: "art",
        toFolderId: null,
      });

      expect(db.characterFolderEntry.deleteMany).toHaveBeenCalled();
      expect(db.characterFolderEntry.createMany).not.toHaveBeenCalled();
    });

    it("refuses a call that names neither a source nor a destination", async () => {
      await expect(
        service.moveCharacters(OWNER, { characterIds: ["char-1"] }),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuses a folder that is not yours", async () => {
      await expect(
        service.moveCharacters(OWNER, {
          characterIds: ["char-1"],
          toFolderId: "somebody-elses",
        }),
      ).rejects.toThrow(/Folder not found/);
    });
  });

  describe("foldersForCharacter", () => {
    it("is empty for an orphaned character", async () => {
      db.character.findFirst.mockResolvedValue({ ownerId: null });

      expect(await service.foldersForCharacter("char-1")).toEqual([]);
    });

    it("leaves out folders the current owner keeps private", async () => {
      db.character.findFirst.mockResolvedValue({ ownerId: OWNER });
      db.characterFolder.findMany.mockResolvedValue([
        row("secret", null, { isPrivate: true }),
        row("open"),
      ]);
      db.characterFolderEntry.findMany.mockResolvedValue([
        { folderId: "secret" },
        { folderId: "open" },
      ]);

      const folders = await service.foldersForCharacter("char-1", "visitor");

      expect(folders.map((f) => f.id)).toEqual(["open"]);
    });
  });

  describe("remove", () => {
    it("says how many nested folders went with it", async () => {
      db.characterFolder.findMany.mockResolvedValue([
        row("commissions"),
        row("2024", "commissions"),
        row("paid", "2024"),
      ]);
      db.characterFolder.delete.mockResolvedValue(row("commissions"));

      const result = await service.remove(OWNER, "commissions");

      expect(result.removed).toBe(true);
      expect(result.message).toContain("2 folders inside it");
    });
  });
});
