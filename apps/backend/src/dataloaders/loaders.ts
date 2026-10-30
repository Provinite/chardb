import * as DataLoader from "dataloader";
import type {
  EnumValue,
  MediaTag,
  PendingOwnership,
  Tag,
} from "@chardb/database";
import { DatabaseService } from "../database/database.service";

/** Up to this many enum values per trait, as the trait field has always returned. */
export const ENUM_VALUES_PER_TRAIT = 100;

/** Groups `rows` under `key(row)`, answering every requested key in order. */
function groupBy<Row>(
  keys: readonly string[],
  rows: Row[],
  key: (row: Row) => string | null,
): Row[][] {
  const groups = new Map<string, Row[]>(keys.map((k) => [k, []]));
  for (const row of rows) {
    const k = key(row);
    if (k !== null) groups.get(k)?.push(row);
  }
  return keys.map((k) => groups.get(k) ?? []);
}

/** Counts by `key`, answering 0 for a requested key with no rows. */
function countsFor(
  keys: readonly string[],
  groups: { key: string | null; count: number }[],
): number[] {
  const counts = new Map<string, number>();
  for (const g of groups) if (g.key !== null) counts.set(g.key, g.count);
  return keys.map((k) => counts.get(k) ?? 0);
}

/**
 * One request's loaders. Each field that would otherwise query once per
 * parent asks its loader instead, and every key asked for in the same tick
 * is answered by a single query. Built fresh per request, so nothing cached
 * here outlives the request that read it.
 */
export class Loaders {
  constructor(private readonly db: DatabaseService) {}

  readonly mediaCountByCharacter = new DataLoader<string, number>(
    async (ids) => {
      const groups = await this.db.media.groupBy({
        by: ["characterId"],
        where: { characterId: { in: [...ids] } },
        _count: { _all: true },
      });
      return countsFor(
        ids,
        groups.map((g) => ({ key: g.characterId, count: g._count._all })),
      );
    },
  );

  readonly mediaCountByGallery = new DataLoader<string, number>(async (ids) => {
    const groups = await this.db.media.groupBy({
      by: ["galleryId"],
      where: { galleryId: { in: [...ids] } },
      _count: { _all: true },
    });
    return countsFor(
      ids,
      groups.map((g) => ({ key: g.galleryId, count: g._count._all })),
    );
  });

  readonly likeCountByCharacter = new DataLoader<string, number>(
    async (ids) => {
      const groups = await this.db.like.groupBy({
        by: ["characterId"],
        where: { characterId: { in: [...ids] } },
        _count: { _all: true },
      });
      return countsFor(
        ids,
        groups.map((g) => ({ key: g.characterId, count: g._count._all })),
      );
    },
  );

  readonly likeCountByGallery = new DataLoader<string, number>(async (ids) => {
    const groups = await this.db.like.groupBy({
      by: ["galleryId"],
      where: { galleryId: { in: [...ids] } },
      _count: { _all: true },
    });
    return countsFor(
      ids,
      groups.map((g) => ({ key: g.galleryId, count: g._count._all })),
    );
  });

  readonly likeCountByComment = new DataLoader<string, number>(async (ids) => {
    const groups = await this.db.like.groupBy({
      by: ["commentId"],
      where: { commentId: { in: [...ids] } },
      _count: { _all: true },
    });
    return countsFor(
      ids,
      groups.map((g) => ({ key: g.commentId, count: g._count._all })),
    );
  });

  /** Serves both `Character.tags` and `Character.tags_rel` (#438). */
  readonly tagsByCharacter = new DataLoader<string, Tag[]>(async (ids) => {
    const rows = await this.db.characterTag.findMany({
      where: { characterId: { in: [...ids] } },
      include: { tag: true },
    });
    return groupBy(ids, rows, (row) => row.characterId).map((group) =>
      group.map((row) => row.tag),
    );
  });

  readonly tagsByMedia = new DataLoader<string, (MediaTag & { tag: Tag })[]>(
    async (ids) => {
      const rows = await this.db.mediaTag.findMany({
        where: { mediaId: { in: [...ids] } },
        include: { tag: true },
      });
      return groupBy(ids, rows, (row) => row.mediaId);
    },
  );

  readonly enumValuesByTrait = new DataLoader<string, EnumValue[]>(
    async (ids) => {
      const rows = await this.db.enumValue.findMany({
        where: { traitId: { in: [...ids] } },
        orderBy: { order: "asc" },
      });
      return groupBy(ids, rows, (row) => row.traitId).map((group) =>
        group.slice(0, ENUM_VALUES_PER_TRAIT),
      );
    },
  );

  /** The account an item waits on, or null. One per item: item_id is unique. */
  readonly pendingOwnershipByItem = new DataLoader<
    string,
    PendingOwnership | null
  >(async (ids) => {
    const rows = await this.db.pendingOwnership.findMany({
      where: { itemId: { in: [...ids] } },
    });
    return groupBy(ids, rows, (row) => row.itemId).map(
      (group) => group[0] ?? null,
    );
  });
}
