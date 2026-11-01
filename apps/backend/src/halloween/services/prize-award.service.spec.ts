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
  let items: { grantItemInTransaction: jest.Mock };
  let pendingOwnership: { createForCharacter: jest.Mock };
  let service: PrizeAwardService;

  beforeEach(() => {
    tx = {
      community: {
        findFirst: jest.fn().mockResolvedValue({ id: "community-1" }),
      },
      itemType: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: "it-1", communityId: "community-1" }),
      },
      character: {
        findFirst: jest.fn().mockResolvedValue({
          id: "ch-1",
          ownerId: null,
          species: { communityId: "community-1" },
        }),
      },
      pendingOwnership: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    items = { grantItemInTransaction: jest.fn().mockResolvedValue([]) };
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

    it("has nothing to check for a prize with no chardb item or character", async () => {
      await expect(validate(prize())).resolves.toBeUndefined();
      expect(tx.community.findFirst).not.toHaveBeenCalled();
    });

    it("accepts an item type of the guild's community", async () => {
      await expect(
        validate(prize({ itemTypeId: "it-1" })),
      ).resolves.toBeUndefined();
      expect(tx.community.findFirst).toHaveBeenCalledWith({
        where: { discordGuildId: GUILD_ID },
      });
    });

    it("refuses an item prize in a guild no community is linked to", async () => {
      tx.community.findFirst.mockResolvedValue(null);
      await expect(
        validate(prize({ itemTypeId: "it-1" })),
      ).rejects.toBeInstanceOf(HalloweenDiscordError);
    });

    it("refuses an item type that does not exist", async () => {
      tx.itemType.findUnique.mockResolvedValue(null);
      await expect(validate(prize({ itemTypeId: "it-1" }))).rejects.toThrow(
        "This prize couldn't be delivered. Please let staff know.",
      );
    });

    // What is wrong, and with which prize, goes beside the static message.
    it("says which prize, and what is wrong with it, as details", async () => {
      tx.character.findFirst.mockResolvedValue({
        id: "ch-1",
        ownerId: "someone",
        species: { communityId: "community-1" },
      });
      const error = (await validate(prize({ characterId: "ch-1" })).catch(
        (e: unknown) => e,
      )) as HalloweenDiscordError;
      expect(error.sourceError?.message).toBe("Prize is misconfigured");
      expect(error.details).toEqual({
        prizeId: "myo",
        guildId: GUILD_ID,
        itemTypeId: null,
        characterId: "ch-1",
        problem: "the character is already owned",
      });
    });

    it("refuses another community's item type", async () => {
      tx.itemType.findUnique.mockResolvedValue({
        id: "it-1",
        communityId: "other",
      });
      await expect(
        validate(prize({ itemTypeId: "it-1" })),
      ).rejects.toBeInstanceOf(HalloweenDiscordError);
    });

    it("accepts an unowned character", async () => {
      await expect(
        validate(prize({ characterId: "ch-1" })),
      ).resolves.toBeUndefined();
    });

    // Without this, any Discord server's admin could give away an unowned
    // character from any community on chardb.
    it("refuses another community's character", async () => {
      tx.character.findFirst.mockResolvedValue({
        id: "ch-1",
        ownerId: null,
        species: { communityId: "other" },
      });
      await expect(
        validate(prize({ characterId: "ch-1" })),
      ).rejects.toBeInstanceOf(HalloweenDiscordError);
    });

    it("refuses a character with no species, and so no community", async () => {
      tx.character.findFirst.mockResolvedValue({
        id: "ch-1",
        ownerId: null,
        species: null,
      });
      await expect(
        validate(prize({ characterId: "ch-1" })),
      ).rejects.toBeInstanceOf(HalloweenDiscordError);
    });

    it("refuses a character prize in a guild no community is linked to", async () => {
      tx.community.findFirst.mockResolvedValue(null);
      await expect(
        validate(prize({ characterId: "ch-1" })),
      ).rejects.toBeInstanceOf(HalloweenDiscordError);
    });

    it("refuses a missing character", async () => {
      tx.character.findFirst.mockResolvedValue(null);
      await expect(
        validate(prize({ characterId: "ch-1" })),
      ).rejects.toBeInstanceOf(HalloweenDiscordError);
    });

    it("refuses a character someone already owns", async () => {
      tx.character.findFirst.mockResolvedValue({ id: "ch-1", ownerId: "u" });
      await expect(
        validate(prize({ characterId: "ch-1" })),
      ).rejects.toBeInstanceOf(HalloweenDiscordError);
    });

    it("refuses a character already promised to someone", async () => {
      tx.pendingOwnership.findUnique.mockResolvedValue({
        id: "po",
        claimedAt: null,
      });
      await expect(
        validate(prize({ characterId: "ch-1" })),
      ).rejects.toBeInstanceOf(HalloweenDiscordError);
    });

    // A claimed promise is history: its owner has since given the character
    // back to the community.
    it("accepts a character whose earlier promise was claimed", async () => {
      tx.pendingOwnership.findUnique.mockResolvedValue({
        id: "po",
        claimedAt: new Date("2026-02-26"),
      });
      await expect(
        validate(prize({ characterId: "ch-1" })),
      ).resolves.toBeUndefined();
    });
  });

  // Inside the knock's transaction, so the prize commits with the win.
  describe("grant", () => {
    const knockTx = { knock: true };
    // As the knock's interaction carries them.
    const winner = {
      id: USER_ID,
      username: "neo.baka",
      global_name: "Neo the Baka",
    };
    const grant = (p: HalloweenPrize) =>
      service.grant(
        p,
        winner,
        knockTx as unknown as Parameters<PrizeAwardService["grant"]>[2],
      );

    it("grants one of the item to the winner's Discord account", async () => {
      await grant(prize({ itemTypeId: "it-1" }));
      expect(items.grantItemInTransaction).toHaveBeenCalledWith(
        knockTx,
        {
          itemTypeId: "it-1",
          quantity: 1,
          pendingOwner: {
            provider: ExternalAccountProvider.DISCORD,
            providerAccountId: USER_ID,
          },
          actor: {
            actorLabel: "halloween-bot",
            reason: "Halloween prize: MYO",
          },
        },
        // The id came from Discord, signed, so there is no need to ask; the
        // names came with it, so staff can find the winner by them (#445).
        {
          discordIdVerified: true,
          discordNames: {
            displayIdentifier: "neo.baka",
            displayName: "Neo the Baka",
          },
        },
      );
    });

    it("hands the character to the winner's Discord account", async () => {
      await grant(prize({ characterId: "ch-1" }));
      expect(pendingOwnership.createForCharacter).toHaveBeenCalledWith(
        "ch-1",
        ExternalAccountProvider.DISCORD,
        USER_ID,
        { displayIdentifier: "neo.baka", displayName: "Neo the Baka" },
        knockTx,
      );
    });

    it("does nothing for a prize with no chardb item or character", async () => {
      await grant(prize());
      expect(items.grantItemInTransaction).not.toHaveBeenCalled();
      expect(pendingOwnership.createForCharacter).not.toHaveBeenCalled();
    });
  });
});
