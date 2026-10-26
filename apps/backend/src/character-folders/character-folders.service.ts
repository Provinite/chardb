import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Visibility } from "@chardb/database";
import { DatabaseService } from "../database/database.service";
import { notDeleted } from "../common/utils/prisma-filters";
import { RemovalResponse } from "../shared/entities/removal-response.entity";
import { CharacterFolder } from "./entities/character-folder.entity";
import {
  CreateCharacterFolderInput,
  MAX_FOLDER_DEPTH,
  MAX_FOLDERS_PER_CHARACTER,
  MAX_FOLDERS_PER_OWNER,
  MoveCharacterFolderInput,
  MoveCharactersToFolderInput,
  SetCharacterFoldersInput,
  UpdateCharacterFolderInput,
} from "./dto/character-folder.dto";
import {
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

/** The columns every read here needs, and nothing else. */
const folderShape = {
  id: true,
  parentId: true,
  name: true,
  isPrivate: true,
  sortOrder: true,
} satisfies Prisma.CharacterFolderSelect;

type FolderRow = Prisma.CharacterFolderGetPayload<{
  select: typeof folderShape;
}>;

/**
 * Personal filing for characters.
 *
 * Two rules run through everything below and are worth stating once.
 *
 * **Ownership is checked when folders are read, not when a character moves.**
 * A trade does not delete the previous owner's entry rows; they are filtered
 * out because the character no longer belongs to the folder's owner. It leaves
 * rows behind, and in exchange no transfer path -- trade, direct transfer,
 * claim, or one written next year -- has to remember to evict.
 *
 * **Private hides a subtree.** A folder's own flag is never the whole answer
 * for a visitor: `isVisibleToVisitor` walks its ancestors too, so a public
 * folder inside a private one stays hidden along with it.
 */
@Injectable()
export class CharacterFoldersService {
  constructor(private readonly db: DatabaseService) {}

  // -- reads -------------------------------------------------------------

  /**
   * One person's whole workspace, with subtree counts.
   *
   * Returned flat rather than nested; the browser builds the tree. It is one
   * query for every folder however deep they go, and navigating between
   * folders then costs nothing.
   *
   * `communityId` narrows the counting, not the folders. Folders span
   * communities -- a "WIP" holds characters from several -- so inside one
   * community a folder that holds nothing there reports zero rather than
   * vanishing, and can still be filed into.
   */
  async listForOwner(
    ownerId: string,
    viewerId: string | undefined,
    communityId?: string,
  ): Promise<CharacterFolder[]> {
    const isOwner = viewerId !== undefined && viewerId === ownerId;

    const folders = await this.db.characterFolder.findMany({
      where: { ownerId },
      select: folderShape,
    });

    const byId = indexById(folders);
    const visible = isOwner
      ? folders
      : folders.filter((folder) => isVisibleToVisitor(folder, byId));

    if (visible.length === 0) return [];

    const counts = await this.countMembers(
      ownerId,
      folders,
      isOwner,
      communityId,
    );

    return visible
      .sort(compareFolders)
      .map((folder) => this.toGraphql(folder, counts.get(folder.id) ?? 0));
  }

  /**
   * The folders one character sits in, as far as this viewer is concerned.
   *
   * Empty for an orphaned character, and empty of anything the current owner
   * has kept private.
   */
  async foldersForCharacter(
    characterId: string,
    viewerId?: string,
  ): Promise<CharacterFolder[]> {
    const character = await this.db.character.findFirst({
      where: { id: characterId, ...notDeleted },
      select: { ownerId: true },
    });

    if (!character?.ownerId) return [];

    const ownerId = character.ownerId;
    const isOwner = viewerId === ownerId;

    // The owner's whole workspace, because deciding whether one folder is
    // visible means looking at its ancestors.
    const folders = await this.db.characterFolder.findMany({
      where: { ownerId },
      select: folderShape,
    });
    const byId = indexById(folders);

    const entries = await this.db.characterFolderEntry.findMany({
      where: { characterId, folder: { ownerId } },
      select: { folderId: true },
    });
    const filedIn = new Set(entries.map((entry) => entry.folderId));

    const counts = await this.countMembers(
      ownerId,
      folders,
      isOwner,
      undefined,
    );

    return folders
      .filter((folder) => filedIn.has(folder.id))
      .filter((folder) => isOwner || isVisibleToVisitor(folder, byId))
      .sort(compareFolders)
      .map((folder) => this.toGraphql(folder, counts.get(folder.id) ?? 0));
  }

  // -- folder mutations --------------------------------------------------

  async create(
    ownerId: string,
    input: CreateCharacterFolderInput,
  ): Promise<CharacterFolder> {
    const name = this.cleanName(input.name);
    const folders = await this.loadWorkspace(ownerId);

    if (folders.length >= MAX_FOLDERS_PER_OWNER) {
      throw new BadRequestException(
        `You can have at most ${MAX_FOLDERS_PER_OWNER} folders`,
      );
    }

    const parentId = input.parentId ?? null;
    if (parentId) {
      const parent = this.mustOwn(folders, parentId);
      const byId = indexById(folders);
      if (depthOf(parent, byId) + 1 > MAX_FOLDER_DEPTH) {
        throw new BadRequestException(
          `Folders can be nested at most ${MAX_FOLDER_DEPTH} deep`,
        );
      }
    }

    this.assertNameFree(folders, parentId, name, null);

    const created = await this.db.characterFolder.create({
      data: {
        ownerId,
        parentId,
        name,
        isPrivate: input.isPrivate ?? false,
        sortOrder: this.nextSortOrder(folders, parentId),
      },
      select: folderShape,
    });

    return this.toGraphql(created, 0);
  }

  async update(
    ownerId: string,
    input: UpdateCharacterFolderInput,
  ): Promise<CharacterFolder> {
    const folders = await this.loadWorkspace(ownerId);
    const folder = this.mustOwn(folders, input.id);

    const name =
      input.name === undefined ? folder.name : this.cleanName(input.name);
    if (name !== folder.name) {
      this.assertNameFree(folders, folder.parentId, name, folder.id);
    }

    const updated = await this.db.characterFolder.update({
      where: { id: folder.id },
      data: { name, isPrivate: input.isPrivate ?? folder.isPrivate },
      select: folderShape,
    });

    const counts = await this.countMembers(ownerId, folders, true, undefined);
    return this.toGraphql(updated, counts.get(updated.id) ?? 0);
  }

  /**
   * Reparent a folder, reorder it, or both, and hand back the workspace.
   *
   * The whole list rather than the folder, because one drop renumbers a
   * sibling group and can empty another -- a client given only the folder it
   * moved would have to guess at the rest.
   */
  async move(
    ownerId: string,
    input: MoveCharacterFolderInput,
  ): Promise<CharacterFolder[]> {
    const folders = await this.loadWorkspace(ownerId);
    const folder = this.mustOwn(folders, input.id);

    const byId = indexById(folders);
    const byParent = indexByParent(folders);

    const parentId =
      input.parentId === undefined ? folder.parentId : input.parentId;

    if (parentId !== folder.parentId) {
      if (parentId) {
        const parent = this.mustOwn(folders, parentId);

        // A folder cannot be moved inside itself or anything it contains --
        // the subtree would leave the tree entirely and stop being reachable
        // from the root.
        if (
          parent.id === folder.id ||
          descendantIds(folder.id, byParent).has(parent.id)
        ) {
          throw new BadRequestException(
            "A folder cannot be moved inside itself",
          );
        }

        // The subtree travels with it, so the check is against the deepest
        // thing inside rather than the folder being dragged.
        const landing =
          depthOf(parent, byId) + subtreeHeight(folder.id, byParent);
        if (landing > MAX_FOLDER_DEPTH) {
          throw new BadRequestException(
            `Folders can be nested at most ${MAX_FOLDER_DEPTH} deep`,
          );
        }
      }

      this.assertNameFree(folders, parentId, folder.name, folder.id);
    }

    const siblings = (byParent.get(parentId) ?? [])
      .filter((sibling) => sibling.id !== folder.id)
      .sort(compareFolders);

    const index =
      input.index === undefined
        ? siblings.length
        : Math.min(input.index, siblings.length);
    siblings.splice(index, 0, { ...folder, parentId });

    // Renumbered from 1, so that a group nobody has ordered stays at 0 and
    // `nextSortOrder` can still tell the two apart.
    await this.db.$transaction([
      this.db.characterFolder.update({
        where: { id: folder.id },
        data: { parentId },
      }),
      ...siblings.map((sibling, position) =>
        this.db.characterFolder.update({
          where: { id: sibling.id },
          data: { sortOrder: position + 1 },
        }),
      ),
    ]);

    return this.listForOwner(ownerId, ownerId, undefined);
  }

  /**
   * Delete a folder and everything nested under it.
   *
   * The characters are untouched. Only the entry rows go, by cascade, and
   * whatever was filed reappears at the root.
   */
  async remove(ownerId: string, id: string): Promise<RemovalResponse> {
    const folders = await this.loadWorkspace(ownerId);
    const folder = this.mustOwn(folders, id);
    const nested = descendantIds(folder.id, indexByParent(folders)).size;

    await this.db.characterFolder.delete({ where: { id: folder.id } });

    return {
      removed: true,
      message:
        nested === 0
          ? `Deleted "${folder.name}"`
          : `Deleted "${folder.name}" and ${nested} folder${nested === 1 ? "" : "s"} inside it`,
    };
  }

  // -- filing ------------------------------------------------------------

  /**
   * File characters, unfile them, or move them between folders.
   *
   * One entry point for all three because the browser's drag is all three
   * depending on where it started and where it landed, and splitting them
   * would mean the client deciding which mutation a drop was.
   */
  async moveCharacters(
    ownerId: string,
    input: MoveCharactersToFolderInput,
  ): Promise<number> {
    const { characterIds, toFolderId, fromFolderId } = input;

    if (!toFolderId && !fromFolderId) {
      throw new BadRequestException(
        "Say where the characters are going, where they are coming from, or both",
      );
    }

    const folders = await this.loadWorkspace(ownerId);
    if (toFolderId) this.mustOwn(folders, toFolderId);
    if (fromFolderId) this.mustOwn(folders, fromFolderId);

    const ids = [...new Set(characterIds)];
    await this.assertOwnsCharacters(ownerId, ids);

    if (toFolderId) {
      await this.assertRoomForFolders(toFolderId, ids);
    }

    await this.db.$transaction(async (tx) => {
      if (fromFolderId) {
        await tx.characterFolderEntry.deleteMany({
          where: { folderId: fromFolderId, characterId: { in: ids } },
        });
      }

      if (toFolderId) {
        await tx.characterFolderEntry.createMany({
          data: ids.map((characterId) => ({
            folderId: toFolderId,
            characterId,
          })),
          skipDuplicates: true,
        });
      }
    });

    return ids.length;
  }

  /** Replace the set of folders one character is in. */
  async setCharacterFolders(
    ownerId: string,
    input: SetCharacterFoldersInput,
  ): Promise<CharacterFolder[]> {
    const folderIds = [...new Set(input.folderIds)];

    if (folderIds.length > MAX_FOLDERS_PER_CHARACTER) {
      throw new BadRequestException(
        `A character can be in at most ${MAX_FOLDERS_PER_CHARACTER} folders`,
      );
    }

    const folders = await this.loadWorkspace(ownerId);
    for (const folderId of folderIds) this.mustOwn(folders, folderId);
    await this.assertOwnsCharacters(ownerId, [input.characterId]);

    await this.db.$transaction(async (tx) => {
      await tx.characterFolderEntry.deleteMany({
        where: {
          characterId: input.characterId,
          folder: { ownerId },
          folderId: { notIn: folderIds },
        },
      });

      if (folderIds.length > 0) {
        await tx.characterFolderEntry.createMany({
          data: folderIds.map((folderId) => ({
            folderId,
            characterId: input.characterId,
          })),
          skipDuplicates: true,
        });
      }
    });

    return this.foldersForCharacter(input.characterId, ownerId);
  }

  // -- internals ---------------------------------------------------------

  private async loadWorkspace(ownerId: string): Promise<FolderRow[]> {
    return this.db.characterFolder.findMany({
      where: { ownerId },
      select: folderShape,
    });
  }

  /**
   * Distinct characters per folder subtree.
   *
   * Entry rows are fetched as pairs rather than aggregated in SQL because the
   * rollup has to union sets: a character in two sub-folders of one parent is
   * one character in that parent, and a `groupBy` count would report it twice.
   */
  private async countMembers(
    ownerId: string,
    folders: readonly FolderRow[],
    isOwner: boolean,
    communityId: string | undefined,
  ): Promise<Map<string, number>> {
    const entries = await this.db.characterFolderEntry.findMany({
      where: {
        folder: { ownerId },
        character: {
          ...notDeleted,
          // The transfer rule: a character that changed hands stops counting
          // towards the folders its previous owner filed it in.
          ownerId,
          ...(communityId ? { species: { communityId } } : {}),
          ...(isOwner ? {} : { visibility: Visibility.PUBLIC }),
        },
      },
      select: { folderId: true, characterId: true },
    });

    const direct = new Map<string, Set<string>>();
    for (const entry of entries) {
      const members = direct.get(entry.folderId);
      if (members) {
        members.add(entry.characterId);
      } else {
        direct.set(entry.folderId, new Set([entry.characterId]));
      }
    }

    return rollUpCounts(folders, indexById(folders), direct);
  }

  private toGraphql(
    folder: FolderNode,
    characterCount: number,
  ): CharacterFolder {
    return {
      id: folder.id,
      parentId: folder.parentId,
      name: folder.name,
      isPrivate: folder.isPrivate,
      sortOrder: folder.sortOrder,
      characterCount,
    };
  }

  private cleanName(name: string): string {
    const cleaned = name.trim().replace(/\s+/g, " ");
    if (cleaned.length === 0) {
      throw new BadRequestException("Folder name is required");
    }
    return cleaned;
  }

  private mustOwn(folders: readonly FolderRow[], id: string): FolderRow {
    const folder = folders.find((candidate) => candidate.id === id);
    if (!folder) throw new NotFoundException("Folder not found");
    return folder;
  }

  /**
   * Refuse a sibling name that is already taken, ignoring case.
   *
   * The partial unique indexes enforce this too, and have to -- two requests
   * can pass this check at the same moment. Doing it here as well is what
   * turns a constraint violation into a sentence the owner can act on.
   */
  private assertNameFree(
    folders: readonly FolderRow[],
    parentId: string | null,
    name: string,
    ignoreId: string | null,
  ): void {
    const taken = folders.some(
      (folder) =>
        folder.id !== ignoreId &&
        folder.parentId === parentId &&
        folder.name.toLowerCase() === name.toLowerCase(),
    );

    if (taken) {
      throw new BadRequestException(
        `You already have a folder called "${name}" here`,
      );
    }
  }

  /**
   * Where a new folder lands among its siblings.
   *
   * Zero while nobody has ordered that group, so it slots in alphabetically.
   * Once somebody has dragged one of its siblings the group carries explicit
   * positions, and a new folder goes last rather than jumping to the front.
   */
  private nextSortOrder(
    folders: readonly FolderRow[],
    parentId: string | null,
  ): number {
    const siblings = folders.filter((folder) => folder.parentId === parentId);
    const ordered = siblings.some((sibling) => sibling.sortOrder !== 0);
    if (!ordered) return 0;
    return Math.max(...siblings.map((sibling) => sibling.sortOrder)) + 1;
  }

  private async assertOwnsCharacters(
    ownerId: string,
    characterIds: string[],
  ): Promise<void> {
    const owned = await this.db.character.count({
      where: { id: { in: characterIds }, ownerId, ...notDeleted },
    });

    if (owned !== characterIds.length) {
      throw new ForbiddenException("You can only file characters you own");
    }
  }

  /**
   * Refuse a bulk file that would push any character past the per-character
   * folder cap, rather than applying it partly.
   */
  private async assertRoomForFolders(
    toFolderId: string,
    characterIds: string[],
  ): Promise<void> {
    const counts = await this.db.characterFolderEntry.groupBy({
      by: ["characterId"],
      where: {
        characterId: { in: characterIds },
        folderId: { not: toFolderId },
      },
      _count: { folderId: true },
    });

    const over = counts.find(
      (row) => row._count.folderId >= MAX_FOLDERS_PER_CHARACTER,
    );

    if (over) {
      throw new BadRequestException(
        `A character can be in at most ${MAX_FOLDERS_PER_CHARACTER} folders`,
      );
    }
  }
}
