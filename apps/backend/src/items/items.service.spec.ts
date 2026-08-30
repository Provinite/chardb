import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ItemsService } from "./items.service";
import { DatabaseService } from "../database/database.service";
import { PendingOwnershipService } from "../pending-ownership/pending-ownership.service";
import { DiscordService } from "../discord/discord.service";
import { ItemTransactionsService } from "../item-transactions/item-transactions.service";
import { ItemTransactionKind } from "@chardb/database";
import { mockDatabaseService } from "../../test/setup";

const mockPendingOwnershipService = {
  createForItem: jest.fn(),
  checkIfAccountClaimed: jest.fn(),
};
const mockDiscordService = {
  validateUserId: jest.fn(),
  resolveUsernameToId: jest.fn(),
};
const mockItemTransactions = { recordBatch: jest.fn() };

/** What grantItem/revokeItems handed the ledger on the last call. */
interface RecordedBatch {
  communityId: string;
  itemTypeId: string;
  itemIds: string[];
  kind: ItemTransactionKind;
  fromUserId?: string | null;
  toUserId?: string | null;
  actorUserId?: string | null;
  reason?: string | null;
}
const lastBatch = (): RecordedBatch =>
  mockItemTransactions.recordBatch.mock.calls.at(-1)?.[0] as RecordedBatch;

describe("ItemsService", () => {
  let service: ItemsService;

  const itemType = {
    id: "type1",
    communityId: "comm1",
    name: "Trait Change Potion",
  };
  const actor = { actorUserId: "staff1", reason: "Prompt completion" };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        {
          provide: PendingOwnershipService,
          useValue: mockPendingOwnershipService,
        },
        { provide: DiscordService, useValue: mockDiscordService },
        { provide: ItemTransactionsService, useValue: mockItemTransactions },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);

    mockDatabaseService.itemType.findUnique.mockResolvedValue(itemType);
    mockDatabaseService.user.findUnique.mockResolvedValue({ id: "user1" });
    mockDatabaseService.communityMember.findFirst.mockResolvedValue({
      id: "member1",
    });
    mockDatabaseService.item.createMany.mockResolvedValue({ count: 1 });
    mockDatabaseService.item.findMany.mockResolvedValue([]);
  });

  describe("grantItem", () => {
    it("creates one row per unit, because there is no stacking", async () => {
      await service.grantItem({
        itemTypeId: "type1",
        userId: "user1",
        quantity: 3,
        actor,
      });

      const { data } = mockDatabaseService.item.createMany.mock.calls[0][0] as {
        data: { id: string; itemTypeId: string; ownerId: string | null }[];
      };

      expect(data).toHaveLength(3);
      // Distinct ids, generated up front because createMany cannot return them
      // and the ledger rows need them in the same transaction.
      expect(new Set(data.map((d) => d.id)).size).toBe(3);
      expect(data.every((d) => d.ownerId === "user1")).toBe(true);
    });

    it("never reads an existing stack, so concurrent grants cannot race", async () => {
      // The old read-then-write is what let two grants both find nothing and
      // both insert. There is nothing left to read.
      await service.grantItem({
        itemTypeId: "type1",
        userId: "user1",
        quantity: 2,
        actor,
      });

      expect(mockDatabaseService.item.findFirst).not.toHaveBeenCalled();
    });

    it("records one ledger batch naming every item it created", async () => {
      await service.grantItem({
        itemTypeId: "type1",
        userId: "user1",
        quantity: 3,
        actor,
      });

      const { data } = mockDatabaseService.item.createMany.mock.calls[0][0] as {
        data: { id: string }[];
      };
      const batch = lastBatch();

      expect(mockItemTransactions.recordBatch).toHaveBeenCalledTimes(1);
      expect(batch.kind).toBe(ItemTransactionKind.GRANT);
      expect(batch.itemIds).toEqual(data.map((d) => d.id));
      expect(batch.toUserId).toBe("user1");
      expect(batch.communityId).toBe("comm1");
      expect(batch.reason).toBe("Prompt completion");
    });

    it("names no recipient for a grant still awaiting a claim", async () => {
      // Nobody holds it yet. The CLAIM row written later is what names the
      // eventual owner, rather than the history claiming an owner who did not
      // exist at the time.
      mockPendingOwnershipService.checkIfAccountClaimed.mockResolvedValue(null);
      mockDiscordService.validateUserId.mockResolvedValue(true);

      await service.grantItem({
        itemTypeId: "type1",
        quantity: 1,
        pendingOwner: {
          provider: "DISCORD",
          providerAccountId: "214000000000009071",
        },
        actor,
      });

      expect(lastBatch().toUserId).toBeNull();
    });

    it("creates a pending record per item, not per grant", async () => {
      // pending_ownership.item_id is unique. One record for a grant of three
      // would leave two items unowned and unclaimable.
      mockPendingOwnershipService.checkIfAccountClaimed.mockResolvedValue(null);
      mockDiscordService.validateUserId.mockResolvedValue(true);
      mockDatabaseService.item.findMany.mockResolvedValue([
        { id: "i1" },
        { id: "i2" },
        { id: "i3" },
      ]);

      await service.grantItem({
        itemTypeId: "type1",
        quantity: 3,
        pendingOwner: {
          provider: "DISCORD",
          providerAccountId: "214000000000009071",
        },
        actor,
      });

      expect(mockPendingOwnershipService.createForItem).toHaveBeenCalledTimes(
        3,
      );
    });

    it("refuses a grant with neither an owner nor a pending owner", async () => {
      await expect(
        service.grantItem({ itemTypeId: "type1", quantity: 1, actor }),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuses a quantity below one", async () => {
      await expect(
        service.grantItem({
          itemTypeId: "type1",
          userId: "user1",
          quantity: 0,
          actor,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuses to grant to someone outside the community", async () => {
      mockDatabaseService.communityMember.findFirst.mockResolvedValue(null);

      await expect(
        service.grantItem({
          itemTypeId: "type1",
          userId: "outsider",
          quantity: 1,
          actor,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDatabaseService.item.createMany).not.toHaveBeenCalled();
    });

    it("refuses an unknown item type", async () => {
      mockDatabaseService.itemType.findUnique.mockResolvedValue(null);

      await expect(
        service.grantItem({
          itemTypeId: "nope",
          userId: "user1",
          quantity: 1,
          actor,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("revokeItems", () => {
    const liveItems = [
      {
        id: "i1",
        itemTypeId: "type1",
        ownerId: "user1",
        quantity: 1,
        itemType: { communityId: "comm1" },
      },
      {
        id: "i2",
        itemTypeId: "type1",
        ownerId: "user1",
        quantity: 1,
        itemType: { communityId: "comm1" },
      },
    ];

    it("destroys softly, so provenance outlives the item", async () => {
      mockDatabaseService.item.findMany.mockResolvedValue(liveItems);

      await service.revokeItems(["i1", "i2"], actor);

      expect(mockDatabaseService.item.delete).not.toHaveBeenCalled();
      const call = mockDatabaseService.item.updateMany.mock.calls[0][0] as {
        data: { destroyedAt: Date; destroyedById: string };
      };
      expect(call.data.destroyedAt).toBeInstanceOf(Date);
      expect(call.data.destroyedById).toBe("staff1");
    });

    it("records one REVOKE batch naming the former owner", async () => {
      mockDatabaseService.item.findMany.mockResolvedValue(liveItems);

      await service.revokeItems(["i1", "i2"], actor);

      const batch = lastBatch();
      expect(batch.kind).toBe(ItemTransactionKind.REVOKE);
      expect(batch.itemIds).toEqual(["i1", "i2"]);
      expect(batch.fromUserId).toBe("user1");
      expect(batch.toUserId).toBeUndefined();
    });

    it("refuses a revoke spanning two item types", async () => {
      // One ledger event names one item type. Mixing them is two events.
      mockDatabaseService.item.findMany.mockResolvedValue([
        liveItems[0],
        { ...liveItems[1], itemTypeId: "type2" },
      ]);

      await expect(service.revokeItems(["i1", "i2"], actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("refuses a revoke spanning two owners", async () => {
      mockDatabaseService.item.findMany.mockResolvedValue([
        liveItems[0],
        { ...liveItems[1], ownerId: "user2" },
      ]);

      await expect(service.revokeItems(["i1", "i2"], actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("refuses when an item is missing or already destroyed", async () => {
      // findMany filters on destroyedAt: null, so a short result means one of
      // the named items is gone.
      mockDatabaseService.item.findMany.mockResolvedValue([liveItems[0]]);

      await expect(service.revokeItems(["i1", "i2"], actor)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockDatabaseService.item.updateMany).not.toHaveBeenCalled();
    });

    it("refuses an empty revoke", async () => {
      await expect(service.revokeItems([], actor)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("reads exclude destroyed items", () => {
    it("keeps destroyed items out of inventories", async () => {
      mockDatabaseService.item.findMany.mockResolvedValue([]);
      mockDatabaseService.item.count.mockResolvedValue(0);

      await service.findAllItems({ ownerId: "user1" });

      const { where } = mockDatabaseService.item.findMany.mock.calls[0][0] as {
        where: { AND: Record<string, unknown>[] };
      };
      expect(where.AND).toContainEqual({ destroyedAt: null });
    });

    it("lets a retired item type be deleted once only destroyed items remain", async () => {
      mockDatabaseService.item.count.mockResolvedValue(0);
      mockDatabaseService.itemType.delete.mockResolvedValue({ id: "type1" });

      await service.deleteItemType("type1");

      const { where } = mockDatabaseService.item.count.mock.calls[0][0] as {
        where: { itemTypeId: string; destroyedAt: null };
      };
      expect(where.destroyedAt).toBeNull();
      expect(mockDatabaseService.itemType.delete).toHaveBeenCalled();
    });
  });
});
