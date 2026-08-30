import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { ItemTransactionsService } from "./item-transactions.service";
import { DatabaseService } from "../database/database.service";
import { ItemTransactionKind } from "@chardb/database";
import { mockDatabaseService } from "../../test/setup";

/** The row shape recordBatch hands to createMany. */
interface RecordedRow {
  communityId: string;
  itemTypeId: string;
  itemId: string;
  kind: ItemTransactionKind;
  batchId: string;
  actorUserId: string | null;
  actorLabel: string | null;
  reason: string | null;
  staffNote: string | null;
}

/** Typed access to what the service last wrote, without an `any` in sight. */
const recordedRows = (mock: jest.Mock): RecordedRow[] =>
  (mock.mock.calls[0][0] as { data: RecordedRow[] }).data;

describe("ItemTransactionsService", () => {
  let service: ItemTransactionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemTransactionsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<ItemTransactionsService>(ItemTransactionsService);
  });

  const baseBatch = {
    communityId: "comm1",
    itemTypeId: "type1",
    itemIds: ["item1", "item2", "item3"],
    kind: ItemTransactionKind.GRANT,
    actorUserId: "staff1",
    reason: "Prompt completion",
  };

  describe("recordBatch", () => {
    it("writes one row per item, all sharing a single batch id", async () => {
      const batchId = await service.recordBatch(baseBatch);

      expect(mockDatabaseService.itemTransaction.createMany).toHaveBeenCalled();
      const data = recordedRows(mockDatabaseService.itemTransaction.createMany);

      expect(data).toHaveLength(3);
      expect(data.map((r) => r.itemId)).toEqual(["item1", "item2", "item3"]);
      expect(new Set(data.map((r) => r.batchId))).toEqual(new Set([batchId]));
    });

    it("honours a supplied batch id so a caller can tie rows to an earlier write", async () => {
      const batchId = await service.recordBatch({
        ...baseBatch,
        batchId: "fixed-batch",
      });

      expect(batchId).toBe("fixed-batch");
      const data = recordedRows(mockDatabaseService.itemTransaction.createMany);
      expect(data.every((r) => r.batchId === "fixed-batch")).toBe(true);
    });

    it("clears actorLabel when a real user is the actor", async () => {
      // A row must not claim both a user and a bot did it.
      await service.recordBatch({
        ...baseBatch,
        actorUserId: "staff1",
        actorLabel: "discord-bot",
      });

      const data = recordedRows(mockDatabaseService.itemTransaction.createMany);
      expect(data[0].actorUserId).toBe("staff1");
      expect(data[0].actorLabel).toBeNull();
    });

    it("keeps actorLabel for system paths with no logged-in user", async () => {
      await service.recordBatch({
        ...baseBatch,
        actorUserId: undefined,
        actorLabel: "discord-bot",
      });

      const data = recordedRows(mockDatabaseService.itemTransaction.createMany);
      expect(data[0].actorUserId).toBeNull();
      expect(data[0].actorLabel).toBe("discord-bot");
    });

    it("refuses a batch that names no items", async () => {
      await expect(
        service.recordBatch({ ...baseBatch, itemIds: [] }),
      ).rejects.toThrow(BadRequestException);
      expect(
        mockDatabaseService.itemTransaction.createMany,
      ).not.toHaveBeenCalled();
    });

    it("refuses a row that can name no responsible party", async () => {
      // An unattributable ledger row is worse than none: it looks like a
      // record while answering nothing.
      await expect(
        service.recordBatch({
          ...baseBatch,
          actorUserId: undefined,
          actorLabel: undefined,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("writes through the supplied transaction client, not the pool", async () => {
      const tx = {
        itemTransaction: { createMany: jest.fn() },
      } as unknown as Parameters<typeof service.recordBatch>[1];

      await service.recordBatch(baseBatch, tx);

      // The whole point: the ledger row commits with the item mutation.
      expect(
        (tx as unknown as { itemTransaction: { createMany: jest.Mock } })
          .itemTransaction.createMany,
      ).toHaveBeenCalled();
      expect(
        mockDatabaseService.itemTransaction.createMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    beforeEach(() => {
      mockDatabaseService.itemTransaction.findMany.mockResolvedValue([]);
      mockDatabaseService.itemTransaction.count.mockResolvedValue(0);
      mockDatabaseService.itemTransaction.groupBy.mockResolvedValue([]);
    });

    it("never searches staff notes", async () => {
      // A member without item permissions must not be able to confirm the
      // contents of a note they are not allowed to read.
      await service.findAll({ communityId: "comm1", search: "secret" });

      const { where } =
        mockDatabaseService.itemTransaction.findMany.mock.calls[0][0];
      expect(JSON.stringify(where)).not.toContain("staffNote");
      expect(JSON.stringify(where)).toContain("reason");
    });

    it("matches a user on any of the three roles a row can name", async () => {
      await service.findAll({ communityId: "comm1", userId: "user1" });

      const { where } =
        mockDatabaseService.itemTransaction.findMany.mock.calls[0][0];
      const serialised = JSON.stringify(where);
      expect(serialised).toContain("fromUserId");
      expect(serialised).toContain("toUserId");
      expect(serialised).toContain("actorUserId");
    });

    it("breaks ties on id so paging cannot repeat or drop a row", async () => {
      // Every row of one batch shares a timestamp, so createdAt alone is not a
      // total order.
      await service.findAll({ communityId: "comm1" });

      const { orderBy } =
        mockDatabaseService.itemTransaction.findMany.mock.calls[0][0];
      expect(orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
    });

    it("reports hasMore from the total, not the page length", async () => {
      mockDatabaseService.itemTransaction.findMany.mockResolvedValue([]);
      mockDatabaseService.itemTransaction.count.mockResolvedValue(100);

      const result = await service.findAll({
        communityId: "comm1",
        limit: 25,
        offset: 0,
      });

      expect(result.total).toBe(100);
      expect(result.hasMore).toBe(true);
    });
  });

  describe("batch sizes", () => {
    it("reports the whole batch even when only part of it is on the page", async () => {
      // The regression that made a real ledger open on "+25" for a batch of
      // several hundred.
      const rows = Array.from({ length: 2 }, (_, i) => ({
        id: `t${i}`,
        batchId: "batch1",
      }));
      mockDatabaseService.itemTransaction.findMany.mockResolvedValue(rows);
      mockDatabaseService.itemTransaction.count.mockResolvedValue(400);
      mockDatabaseService.itemTransaction.groupBy.mockResolvedValue([
        { batchId: "batch1", _count: { _all: 400 } },
      ]);

      const result = await service.findAll({ communityId: "comm1", limit: 2 });

      expect(result.transactions).toHaveLength(2);
      expect(result.transactions.every((t) => t.batchSize === 400)).toBe(true);
    });

    it("falls back to 1 for a batch the count did not return", async () => {
      mockDatabaseService.itemTransaction.findMany.mockResolvedValue([
        { id: "t1", batchId: "orphan" },
      ]);
      mockDatabaseService.itemTransaction.count.mockResolvedValue(1);
      mockDatabaseService.itemTransaction.groupBy.mockResolvedValue([]);

      const result = await service.findAll({ communityId: "comm1" });

      expect(result.transactions[0].batchSize).toBe(1);
    });

    it("asks for counts once per distinct batch, not once per row", async () => {
      mockDatabaseService.itemTransaction.findMany.mockResolvedValue([
        { id: "t1", batchId: "b1" },
        { id: "t2", batchId: "b1" },
        { id: "t3", batchId: "b2" },
      ]);
      mockDatabaseService.itemTransaction.count.mockResolvedValue(3);
      mockDatabaseService.itemTransaction.groupBy.mockResolvedValue([]);

      await service.findAll({ communityId: "comm1" });

      expect(mockDatabaseService.itemTransaction.groupBy).toHaveBeenCalledTimes(
        1,
      );
      const call = mockDatabaseService.itemTransaction.groupBy.mock.calls[0][0];
      expect(call.where.batchId.in).toEqual(["b1", "b2"]);
    });
  });

  describe("findByItem", () => {
    it("returns one item's rows oldest first", async () => {
      mockDatabaseService.itemTransaction.findMany.mockResolvedValue([]);
      mockDatabaseService.itemTransaction.groupBy.mockResolvedValue([]);

      await service.findByItem("item1");

      const call =
        mockDatabaseService.itemTransaction.findMany.mock.calls[0][0];
      expect(call.where).toEqual({ itemId: "item1" });
      expect(call.orderBy).toEqual([{ createdAt: "asc" }, { id: "asc" }]);
    });
  });
});
