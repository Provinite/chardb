import { ModerationStatus, type HalloweenPrize } from "@chardb/database";
import { PrizeImageService } from "./prize-image.service";
import { DatabaseService } from "../../database/database.service";
import { GUILD_ID } from "../testing/fixtures";

const prize = (overrides: Partial<HalloweenPrize>): HalloweenPrize => ({
  guildId: GUILD_ID,
  id: "p",
  name: "P",
  initialStock: 1,
  currentStock: 1,
  weight: 10,
  image: null,
  itemTypeId: null,
  characterId: null,
  ...overrides,
});

const image = (
  status: ModerationStatus,
  mediumUrl: string | null = "https://cdn.test/m.webp",
) => ({
  originalUrl: "https://cdn.test/o.png",
  mediumUrl,
  moderationStatus: status,
});

describe("PrizeImageService", () => {
  let db: {
    itemType: { findMany: jest.Mock };
    character: { findMany: jest.Mock };
  };
  let service: PrizeImageService;

  beforeEach(() => {
    db = {
      itemType: { findMany: jest.fn().mockResolvedValue([]) },
      character: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new PrizeImageService(db as unknown as DatabaseService);
  });

  it("uses the URL staff gave for a prize they deliver themselves", async () => {
    const adopt = prize({ id: "adopt", image: "https://i.test/adopt.png" });
    expect(await service.imageFor(adopt)).toBe("https://i.test/adopt.png");
    expect(db.itemType.findMany).not.toHaveBeenCalled();
  });

  it("uses the item type's image for an item prize", async () => {
    db.itemType.findMany.mockResolvedValue([
      { id: "it-1", image: image(ModerationStatus.APPROVED) },
    ]);
    expect(await service.imageFor(prize({ itemTypeId: "it-1" }))).toBe(
      "https://cdn.test/m.webp",
    );
  });

  it("falls back to the original size when there is no medium one", async () => {
    db.itemType.findMany.mockResolvedValue([
      { id: "it-1", image: image(ModerationStatus.APPROVED, null) },
    ]);
    expect(await service.imageFor(prize({ itemTypeId: "it-1" }))).toBe(
      "https://cdn.test/o.png",
    );
  });

  it("uses the character's main image for a character prize", async () => {
    db.character.findMany.mockResolvedValue([
      { id: "ch-1", mainMedia: { image: image(ModerationStatus.APPROVED) } },
    ]);
    expect(await service.imageFor(prize({ characterId: "ch-1" }))).toBe(
      "https://cdn.test/m.webp",
    );
  });

  // Chardb masks an image until moderation approves it; Discord must not
  // show what chardb would not.
  it.each([ModerationStatus.PENDING, ModerationStatus.REJECTED])(
    "has no image while the chardb image is %s",
    async (status) => {
      db.itemType.findMany.mockResolvedValue([
        { id: "it-1", image: image(status) },
      ]);
      expect(await service.imageFor(prize({ itemTypeId: "it-1" }))).toBeNull();
    },
  );

  it("has no image when the item type or character has none", async () => {
    db.itemType.findMany.mockResolvedValue([{ id: "it-1", image: null }]);
    db.character.findMany.mockResolvedValue([{ id: "ch-1", mainMedia: null }]);
    expect(await service.imageFor(prize({ itemTypeId: "it-1" }))).toBeNull();
    expect(await service.imageFor(prize({ characterId: "ch-1" }))).toBeNull();
  });

  it("looks a whole list up in two queries", async () => {
    db.itemType.findMany.mockResolvedValue([
      { id: "it-1", image: image(ModerationStatus.APPROVED) },
    ]);
    db.character.findMany.mockResolvedValue([
      { id: "ch-1", mainMedia: { image: image(ModerationStatus.APPROVED) } },
    ]);
    const prizes = [
      prize({ id: "a", image: "https://i.test/a.png" }),
      prize({ id: "b", itemTypeId: "it-1" }),
      prize({ id: "c", characterId: "ch-1" }),
    ];
    const images = await service.imagesFor(prizes);
    expect(prizes.map((p) => images.get(p))).toEqual([
      "https://i.test/a.png",
      "https://cdn.test/m.webp",
      "https://cdn.test/m.webp",
    ]);
    expect(db.itemType.findMany).toHaveBeenCalledTimes(1);
    expect(db.character.findMany).toHaveBeenCalledTimes(1);
  });
});
