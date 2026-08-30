import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { ItemsService } from "./items.service";
import type { DbClient } from "../item-transactions/item-transactions.service";
import { DatabaseService } from "../database/database.service";
import { PendingOwnershipService } from "../pending-ownership/pending-ownership.service";
import { DiscordService } from "../discord/discord.service";
import { ItemTransactionsService } from "../item-transactions/item-transactions.service";
import { ItemTransactionKind } from "@chardb/database";
import {
  mockDatabaseService,
  mockNotificationsService,
} from "../../test/setup";
import { NotificationsService } from "../notifications/notifications.service";

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
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
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
    /** Every named row still matched when the UPDATE ran. */
    const allMatched = (ids: string[]) =>
      mockDatabaseService.item.updateMany.mockResolvedValue({
        count: ids.length,
      });

    const liveItems = [
      {
        id: "i1",
        itemTypeId: "type1",
        ownerId: "user1",
        quantity: 1,
        // `name` is selected alongside communityId so the revoke notification
        // can say what was taken.
        itemType: { communityId: "comm1", name: "Rusty Locket" },
      },
      {
        id: "i2",
        itemTypeId: "type1",
        ownerId: "user1",
        quantity: 1,
        // `name` is selected alongside communityId so the revoke notification
        // can say what was taken.
        itemType: { communityId: "comm1", name: "Rusty Locket" },
      },
    ];

    it("destroys softly, so provenance outlives the item", async () => {
      mockDatabaseService.item.findMany.mockResolvedValue(liveItems);
      allMatched(["i1", "i2"]);

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
      allMatched(["i1", "i2"]);

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

    it("re-checks in the UPDATE rather than trusting the read", async () => {
      // The read said both were live; by the time the UPDATE ran, one was
      // not. Reading and then writing would have destroyed the other anyway
      // and recorded a ledger row for both.
      mockDatabaseService.item.findMany.mockResolvedValue(liveItems);
      mockDatabaseService.item.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.revokeItems(["i1", "i2"], actor)).rejects.toThrow(
        ConflictException,
      );
      expect(mockItemTransactions.recordBatch).not.toHaveBeenCalled();
    });

    it("scopes the destroy to an expected owner when given one", async () => {
      // A refund may only take back what the buyer still holds. Naming the
      // owner in the UPDATE is what makes a trade landing mid-refund lose the
      // race rather than cost the new owner their item.
      mockDatabaseService.item.findMany.mockResolvedValue([liveItems[0]]);
      allMatched(["i1"]);

      await service.destroyItems(
        // The mock stands in for a transaction client; it implements the
        // handful of models this touches rather than the whole interface.
        mockDatabaseService as unknown as DbClient,
        ["i1"],
        actor,
        undefined,
        null,
        "user1",
      );

      const call = mockDatabaseService.item.updateMany.mock.calls[0][0] as {
        where: { ownerId?: string; destroyedAt: null };
      };
      expect(call.where.ownerId).toBe("user1");
      expect(call.where.destroyedAt).toBeNull();
    });

    it("leaves the owner unconstrained when none is expected", async () => {
      mockDatabaseService.item.findMany.mockResolvedValue([liveItems[0]]);
      allMatched(["i1"]);

      await service.revokeItems(["i1"], actor);

      const call = mockDatabaseService.item.updateMany.mock.calls[0][0] as {
        where: { ownerId?: string };
      };
      expect(call.where.ownerId).toBeUndefined();
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

describe("ItemsService.findItemEconomy", () => {
  let service: ItemsService;

  const types = [
    { id: "potion", name: "Trait Change Potion", communityId: "comm1" },
    { id: "locket", name: "Heirloom Locket", communityId: "comm1" },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: PendingOwnershipService,
          useValue: mockPendingOwnershipService,
        },
        { provide: DiscordService, useValue: mockDiscordService },
        { provide: ItemTransactionsService, useValue: mockItemTransactions },
      ],
    }).compile();
    service = module.get<ItemsService>(ItemsService);

    mockDatabaseService.itemType.findMany.mockResolvedValue(types);
    mockDatabaseService.item.findMany.mockResolvedValue([]);
    mockDatabaseService.itemTransaction.groupBy.mockResolvedValue([]);
    mockDatabaseService.pendingOwnership.findMany.mockResolvedValue([]);
  });

  it("counts circulation and distinct holders separately", async () => {
    // Three items, two of them held by the same person: circulation 3,
    // holders 2. Conflating the two is the mistake this guards.
    mockDatabaseService.item.findMany.mockResolvedValue([
      { itemTypeId: "potion", ownerId: "alice" },
      { itemTypeId: "potion", ownerId: "alice" },
      { itemTypeId: "potion", ownerId: "bob" },
    ]);

    const report = await service.findItemEconomy("comm1");
    const potion = report.itemTypes.find((t) => t.itemType.id === "potion");

    expect(potion?.circulation).toBe(3);
    expect(potion?.holderCount).toBe(2);
    expect(report.totalCirculation).toBe(3);
    expect(report.totalHolders).toBe(2);
  });

  it("counts an unclaimed item in circulation but toward nobody's holdings", async () => {
    // It exists and was minted, so supply is real -- but it is in no
    // inventory, which is exactly the state the unclaimed column exists for.
    mockDatabaseService.item.findMany.mockResolvedValue([
      { itemTypeId: "potion", ownerId: null },
    ]);
    mockDatabaseService.pendingOwnership.findMany.mockResolvedValue([
      { item: { itemTypeId: "potion" } },
    ]);

    const report = await service.findItemEconomy("comm1");
    const potion = report.itemTypes.find((t) => t.itemType.id === "potion");

    expect(potion?.circulation).toBe(1);
    expect(potion?.holderCount).toBe(0);
    expect(potion?.unclaimed).toBe(1);
    expect(report.totalHolders).toBe(0);
  });

  it("counts a holder of two types once in the community total", async () => {
    mockDatabaseService.item.findMany.mockResolvedValue([
      { itemTypeId: "potion", ownerId: "alice" },
      { itemTypeId: "locket", ownerId: "alice" },
    ]);

    const report = await service.findItemEconomy("comm1");

    expect(report.totalHolders).toBe(1);
    expect(report.itemTypes.every((t) => t.holderCount === 1)).toBe(true);
  });

  it("splits recent movement into grants and revokes, and nets them", async () => {
    mockDatabaseService.itemTransaction.groupBy.mockResolvedValue([
      { itemTypeId: "potion", kind: "GRANT", _count: { _all: 10 } },
      { itemTypeId: "potion", kind: "REVOKE", _count: { _all: 4 } },
      // IMPORT and CLAIM are not movement anyone caused; they must not count.
      { itemTypeId: "potion", kind: "IMPORT", _count: { _all: 99 } },
    ]);

    const report = await service.findItemEconomy("comm1");
    const potion = report.itemTypes.find((t) => t.itemType.id === "potion");

    expect(potion?.grantedRecently).toBe(10);
    expect(potion?.revokedRecently).toBe(4);
    expect(report.netRecently).toBe(6);
  });

  it("only looks back 30 days", async () => {
    await service.findItemEconomy("comm1");

    const call = mockDatabaseService.itemTransaction.groupBy.mock
      .calls[0][0] as { where: { createdAt: { gte: Date } } };
    const days = (Date.now() - call.where.createdAt.gte.getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(30);
  });

  it("lists item types with nothing in circulation, biggest first", async () => {
    // A type with zero items still belongs in the catalogue view -- that is
    // itself the interesting fact about it.
    mockDatabaseService.item.findMany.mockResolvedValue([
      { itemTypeId: "locket", ownerId: "alice" },
    ]);

    const report = await service.findItemEconomy("comm1");

    expect(report.itemTypes.map((t) => t.itemType.id)).toEqual([
      "locket",
      "potion",
    ]);
    expect(
      report.itemTypes.find((t) => t.itemType.id === "potion")?.circulation,
    ).toBe(0);
  });

  it("excludes destroyed items from every count", async () => {
    await service.findItemEconomy("comm1");

    const call = mockDatabaseService.item.findMany.mock.calls[0][0] as {
      where: { destroyedAt: null };
    };
    expect(call.where.destroyedAt).toBeNull();
  });
});

describe("ItemsService.findMemberHoldings", () => {
  let service: ItemsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: PendingOwnershipService,
          useValue: mockPendingOwnershipService,
        },
        { provide: DiscordService, useValue: mockDiscordService },
        { provide: ItemTransactionsService, useValue: mockItemTransactions },
      ],
    }).compile();
    service = module.get<ItemsService>(ItemsService);

    mockDatabaseService.user.findUnique.mockResolvedValue({
      id: "alice",
      username: "alice",
    });
    mockDatabaseService.item.findMany.mockResolvedValue([]);
    mockDatabaseService.pendingOwnership.count.mockResolvedValue(0);
  });

  const held = (id: string, typeId: string, name: string) => ({
    id,
    itemTypeId: typeId,
    createdAt: new Date("2026-01-01"),
    itemType: { id: typeId, name },
  });

  it("groups by item type and lists every item inside", async () => {
    mockDatabaseService.item.findMany.mockResolvedValue([
      held("i1", "potion", "Potion"),
      held("i2", "potion", "Potion"),
      held("i3", "locket", "Locket"),
    ]);

    const report = await service.findMemberHoldings("alice", "comm1");

    expect(report.totalItems).toBe(3);
    expect(report.distinctTypes).toBe(2);
    const potion = report.holdings.find((h) => h.itemType.id === "potion");
    // Individually addressable, not just counted: revoking two of three means
    // naming which two.
    expect(potion?.count).toBe(2);
    expect(potion?.items.map((i) => i.id)).toEqual(["i1", "i2"]);
  });

  it("does not paginate", async () => {
    // The bug this replaces: User.inventories called findAllItems with no
    // limit, took the default of 20, and reported the truncated length as the
    // total. Nothing in the result said it had been cut short.
    mockDatabaseService.item.findMany.mockResolvedValue(
      Array.from({ length: 30 }, (_, i) => held(`i${i}`, "potion", "Potion")),
    );

    const report = await service.findMemberHoldings("alice", "comm1");

    expect(report.totalItems).toBe(30);
    expect(report.holdings[0].items).toHaveLength(30);
    const call = mockDatabaseService.item.findMany.mock.calls[0][0] as {
      take?: number;
    };
    expect(call.take).toBeUndefined();
  });

  it("excludes destroyed items and scopes to the community", async () => {
    await service.findMemberHoldings("alice", "comm1");

    const call = mockDatabaseService.item.findMany.mock.calls[0][0] as {
      where: {
        ownerId: string;
        destroyedAt: null;
        itemType: { communityId: string };
      };
    };
    expect(call.where.ownerId).toBe("alice");
    expect(call.where.destroyedAt).toBeNull();
    expect(call.where.itemType.communityId).toBe("comm1");
  });

  it("orders holdings by size, largest first", async () => {
    mockDatabaseService.item.findMany.mockResolvedValue([
      held("i1", "locket", "Locket"),
      held("i2", "potion", "Potion"),
      held("i3", "potion", "Potion"),
    ]);

    const report = await service.findMemberHoldings("alice", "comm1");

    expect(report.holdings.map((h) => h.itemType.id)).toEqual([
      "potion",
      "locket",
    ]);
  });

  it("refuses an unknown member", async () => {
    mockDatabaseService.user.findUnique.mockResolvedValue(null);

    await expect(service.findMemberHoldings("nobody", "comm1")).rejects.toThrow(
      NotFoundException,
    );
  });
});
