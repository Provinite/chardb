import { ExternalAccountProvider, type HalloweenPrize } from "@chardb/database";
import { PrizeAwardService } from "./prize-award.service";
import { DatabaseService } from "../../database/database.service";
import { ItemsService } from "../../items/items.service";
import { PendingOwnershipService } from "../../pending-ownership/pending-ownership.service";
import { HalloweenDiscordError } from "../errors";
import { GUILD_ID, USER_ID } from "../testing/fixtures";

const prize = (overrides: Partial<HalloweenPrize> = {}): HalloweenPrize => ({
  guildId: GUILD_ID,
  id: "myo",
  name: "MYO",
  initialStock: 1,
  currentStock: 1,
  weight: 10,
  image: "https://i.test/myo.png",
  itemTypeId: null,
  characterId: null,
  ...overrides,
});

describe("PrizeAwardService", () => {
  let tx: {
    community: { findFirst: jest.Mock };
    itemType: { findUnique: jest.Mock };
    character: { findFirst: jest.Mock };
    pendingOwnership: { findUnique: jest.Mock };
  };
  let items: { grantItem: jest.Mock };
  let pendingOwnership: { createForCharacter: jest.Mock };
  let service: PrizeAwardService;

  beforeEach(() => {
    tx = {
      community: { findFirst: jest.fn().mockResolvedValue({ id: "community-1" }) },
      itemType: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: "it-1", communityId: "community-1" }),
      },
      character: {
        findFirst: jest.fn().mockResolvedValue({ id: "ch-1", ownerId: null }),
      },
      pendingOwnership: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    items = { grantItem: jest.fn().mockResolvedValue([]) };
    pendingOwnership = {
      createForCharacter: jest.fn().mockResolvedValue({ claimed: false }),
    };
    service = new PrizeAwardService(
      tx as unknown as DatabaseService,
      items as unknown as ItemsService,
      pendingOwnership as unknown as PendingOwnershipService,
    );
  });

  describe("validate", () => {
    const validate = (p: HalloweenPrize) =>
      service.validate(p, GUILD_ID, tx as unknown as DatabaseService);

    it("has nothing to check for a hand-delivered prize", async () => {
      await expect(validate(prize())).resolves.toBeUndefined();
      expect(tx.community.findFirst).not.toHaveBeenCalled();
    });

    it("accepts an item type of the guild's community", async () => {
      await expect(validate(prize({ itemTypeId: "it-1" }))).resolves.toBeUndefined();
      expect(tx.community.findFirst).toHaveBeenCalledWith({
        where: { discordGuildId: GUILD_ID },
      });
    });

    it("refuses an item prize in a guild no community is linked to", async () => {
      tx.community.findFirst.mockResolvedValue(null);
      await expect(validate(prize({ itemTypeId: "it-1" }))).rejects.toBeInstanceOf(
        HalloweenDiscordError,
      );
    });

    it("refuses an item type that does not exist", async () => {
      tx.itemType.findUnique.mockResolvedValue(null);
      await expect(validate(prize({ itemTypeId: "it-1" }))).rejects.toThrow(
        "This prize couldn't be delivered. Please let staff know.",
      );
    });

    it("refuses another community's item type", async () => {
      tx.itemType.findUnique.mockResolvedValue({ id: "it-1", communityId: "other" });
      await expect(validate(prize({ itemTypeId: "it-1" }))).rejects.toBeInstanceOf(
        HalloweenDiscordError,
      );
    });

    it("accepts an unowned character", async () => {
      await expect(validate(prize({ characterId: "ch-1" }))).resolves.toBeUndefined();
    });

    it("refuses a missing character", async () => {
      tx.character.findFirst.mockResolvedValue(null);
      await expect(validate(prize({ characterId: "ch-1" }))).rejects.toBeInstanceOf(
        HalloweenDiscordError,
      );
    });

    it("refuses a character someone already owns", async () => {
      tx.character.findFirst.mockResolvedValue({ id: "ch-1", ownerId: "u" });
      await expect(validate(prize({ characterId: "ch-1" }))).rejects.toBeInstanceOf(
        HalloweenDiscordError,
      );
    });

    it("refuses a character already promised to someone", async () => {
      tx.pendingOwnership.findUnique.mockResolvedValue({ id: "po" });
      await expect(validate(prize({ characterId: "ch-1" }))).rejects.toBeInstanceOf(
        HalloweenDiscordError,
      );
    });
  });

  describe("award", () => {
    it("grants one of the item to the winner's Discord account", async () => {
      await service.award(prize({ itemTypeId: "it-1" }), USER_ID);
      expect(items.grantItem).toHaveBeenCalledWith({
        itemTypeId: "it-1",
        quantity: 1,
        pendingOwner: {
          provider: ExternalAccountProvider.DISCORD,
          providerAccountId: USER_ID,
        },
        actor: { actorLabel: "halloween-bot", reason: "Halloween prize: MYO" },
      });
    });

    it("hands the character to the winner's Discord account", async () => {
      await service.award(prize({ characterId: "ch-1" }), USER_ID);
      expect(pendingOwnership.createForCharacter).toHaveBeenCalledWith(
        "ch-1",
        ExternalAccountProvider.DISCORD,
        USER_ID,
      );
    });

    it("does nothing for a hand-delivered prize", async () => {
      await service.award(prize(), USER_ID);
      expect(items.grantItem).not.toHaveBeenCalled();
      expect(pendingOwnership.createForCharacter).not.toHaveBeenCalled();
    });
  });
});
