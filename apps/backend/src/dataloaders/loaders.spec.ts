import type { EnumValue } from "@prisma/client";
import { mockDatabaseService } from "../../test/setup";
import { DatabaseService } from "../database/database.service";
import { ENUM_VALUES_PER_TRAIT, Loaders } from "./loaders";

describe("Loaders", () => {
  let loaders: Loaders;

  beforeEach(() => {
    jest.clearAllMocks();
    loaders = new Loaders(mockDatabaseService as unknown as DatabaseService);
  });

  it("answers every key in the order asked, with 0 for a key nothing matched", async () => {
    mockDatabaseService.like.groupBy.mockResolvedValue([
      { galleryId: "b", _count: { _all: 2 } },
      { galleryId: "a", _count: { _all: 5 } },
    ]);

    const counts = await Promise.all(
      ["a", "none", "b"].map((id) => loaders.likeCountByGallery.load(id)),
    );

    expect(counts).toEqual([5, 0, 2]);
    expect(mockDatabaseService.like.groupBy).toHaveBeenCalledTimes(1);
  });

  it("gives each trait its own values, in order, capped as before", async () => {
    const value = (traitId: string, order: number) =>
      ({ id: `${traitId}-${order}`, traitId, order }) as EnumValue;
    const many = Array.from({ length: ENUM_VALUES_PER_TRAIT + 5 }, (_, i) =>
      value("big", i),
    );
    mockDatabaseService.enumValue.findMany.mockResolvedValue([
      value("small", 0),
      ...many,
      value("small", 1),
    ]);

    const [small, big, empty] = await Promise.all([
      loaders.enumValuesByTrait.load("small"),
      loaders.enumValuesByTrait.load("big"),
      loaders.enumValuesByTrait.load("empty"),
    ]);

    expect(small.map((v) => v.id)).toEqual(["small-0", "small-1"]);
    expect(big).toHaveLength(ENUM_VALUES_PER_TRAIT);
    expect(big[0].id).toBe("big-0");
    expect(empty).toEqual([]);
  });

  it("serves a character's tags from one query however many fields ask", async () => {
    const tag = { id: "t1", displayName: "Tag" };
    mockDatabaseService.characterTag.findMany.mockResolvedValue([
      { characterId: "c1", tagId: "t1", tag },
    ]);

    const [forTags, forTagsRel] = await Promise.all([
      loaders.tagsByCharacter.load("c1"),
      loaders.tagsByCharacter.load("c1"),
    ]);

    expect(forTags).toEqual([tag]);
    expect(forTagsRel).toEqual([tag]);
    expect(mockDatabaseService.characterTag.findMany).toHaveBeenCalledTimes(1);
  });

  it("finds a ledger page's pending owners in one query, null for an item nobody waits on (#445)", async () => {
    const waiting = { id: "po1", itemId: "i1" };
    mockDatabaseService.pendingOwnership.findMany.mockResolvedValue([waiting]);

    const owners = await Promise.all(
      ["i1", "i2"].map((id) => loaders.pendingOwnershipByItem.load(id)),
    );

    expect(owners).toEqual([waiting, null]);
    expect(mockDatabaseService.pendingOwnership.findMany).toHaveBeenCalledTimes(
      1,
    );
  });
});
