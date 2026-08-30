import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { TradeStatus } from "@chardb/database";
import { TradesService } from "./trades.service";
import { DatabaseService } from "../database/database.service";
import { ItemTransactionsService } from "../item-transactions/item-transactions.service";
import { CurrencyLedgerService } from "../currencies/currency-ledger.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  mockDatabaseService,
  mockNotificationsService,
} from "../../test/setup";

const mockItemTransactions = { recordBatch: jest.fn() };
const mockCurrencyLedger = { transfer: jest.fn() };

/** A tradeable item of `type1`, held by `alice` unless said otherwise. */
const item = (id: string, ownerId = "alice", itemTypeId = "type1") => ({
  id,
  itemTypeId,
  ownerId,
  destroyedAt: null,
  itemType: {
    communityId: "comm1",
    isTradeable: true,
    name: "Trait Change Potion",
  },
});

describe("TradesService", () => {
  let service: TradesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: ItemTransactionsService, useValue: mockItemTransactions },
        { provide: CurrencyLedgerService, useValue: mockCurrencyLedger },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<TradesService>(TradesService);

    // Both parties are members, and nothing is promised elsewhere, unless a
    // test says otherwise.
    mockDatabaseService.communityMember.count.mockResolvedValue(2);
    mockDatabaseService.tradeItem.findFirst.mockResolvedValue(null);
    mockDatabaseService.trade.create.mockResolvedValue({
      id: "t1",
      items: [],
      currencyLines: [],
    });
  });

  /** The `data` handed to Prisma on the last trade.create. */
  const lastCreate = () =>
    (
      mockDatabaseService.trade.create.mock.calls.at(-1)?.[0] as {
        data: {
          items: { create: Array<Record<string, unknown>> };
          currencyLines: { create: Array<Record<string, unknown>> };
        };
      }
    ).data;

  const baseInput = {
    communityId: "comm1",
    recipientId: "bob",
    offering: [],
    requesting: [],
    coin: [],
  };

  describe("create", () => {
    it("refuses a trade with yourself", async () => {
      await expect(
        service.create("alice", { ...baseInput, recipientId: "alice" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuses an empty table", async () => {
      await expect(service.create("alice", baseInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("records who gives and who receives for an offered row", async () => {
      mockDatabaseService.item.findMany.mockResolvedValue([item("i1")]);

      await service.create("alice", {
        ...baseInput,
        offering: [{ itemId: "i1" }],
      });

      expect(lastCreate().items.create).toEqual([
        { itemId: "i1", sourceUserId: "alice", destinationUserId: "bob" },
      ]);
    });

    it("refuses to offer a row already promised in another open trade", async () => {
      mockDatabaseService.item.findMany.mockResolvedValue([item("i1")]);
      mockDatabaseService.tradeItem.findFirst.mockResolvedValue({
        item: { itemType: { name: "Trait Change Potion" } },
      });

      // Without this an item settles against whichever offer is accepted first
      // and the rest fail at accept, in front of someone who cannot see why.
      await expect(
        service.create("alice", { ...baseInput, offering: [{ itemId: "i1" }] }),
      ).rejects.toThrow(/already offered/i);
    });

    it("refuses to offer a row you do not hold", async () => {
      mockDatabaseService.item.findMany.mockResolvedValue([
        item("i1", "carol"),
      ]);

      await expect(
        service.create("alice", { ...baseInput, offering: [{ itemId: "i1" }] }),
      ).rejects.toThrow(/do not hold/i);
    });

    it("refuses an untradeable type", async () => {
      const locked = item("i1");
      locked.itemType.isTradeable = false;
      mockDatabaseService.item.findMany.mockResolvedValue([locked]);

      await expect(
        service.create("alice", { ...baseInput, offering: [{ itemId: "i1" }] }),
      ).rejects.toThrow(/cannot be traded/i);
    });

    it("stores a by-type request sourced from the recipient", async () => {
      mockDatabaseService.itemType.findMany.mockResolvedValue([
        { id: "type1", name: "Trait Change Potion", isTradeable: true },
      ]);

      await service.create("alice", {
        ...baseInput,
        requesting: [{ itemTypeId: "type1", quantity: 2 }],
      });

      expect(lastCreate().items.create).toEqual([
        {
          itemTypeId: "type1",
          quantity: 2,
          sourceUserId: "bob",
          destinationUserId: "alice",
        },
      ]);
    });

    it("merges two by-type requests for the same type", async () => {
      mockDatabaseService.itemType.findMany.mockResolvedValue([
        { id: "type1", name: "Trait Change Potion", isTradeable: true },
      ]);

      await service.create("alice", {
        ...baseInput,
        requesting: [
          { itemTypeId: "type1", quantity: 2 },
          { itemTypeId: "type1", quantity: 1 },
        ],
      });

      // Two lines for one type would be two selections to satisfy separately,
      // which is one decision more than the offer contains.
      expect(lastCreate().items.create).toHaveLength(1);
      expect(lastCreate().items.create[0].quantity).toBe(3);
    });
  });

  describe("coin", () => {
    beforeEach(() => {
      mockDatabaseService.currency.findMany.mockResolvedValue([{ id: "cur1" }]);
    });

    it("nets opposing amounts into one line", async () => {
      await service.create("alice", {
        ...baseInput,
        coin: [
          { currencyId: "cur1", amount: 250, fromProposer: true },
          { currencyId: "cur1", amount: 100, fromProposer: false },
        ],
      });

      // Coin is fungible; a round trip of 100 is not part of the deal.
      expect(lastCreate().currencyLines.create).toEqual([
        {
          currencyId: "cur1",
          amount: 150,
          sourceUserId: "alice",
          destinationUserId: "bob",
        },
      ]);
    });

    it("flips the direction when the net favours the proposer", async () => {
      await service.create("alice", {
        ...baseInput,
        coin: [
          { currencyId: "cur1", amount: 100, fromProposer: true },
          { currencyId: "cur1", amount: 250, fromProposer: false },
        ],
      });

      expect(lastCreate().currencyLines.create[0]).toMatchObject({
        amount: 150,
        sourceUserId: "bob",
        destinationUserId: "alice",
      });
    });

    it("drops a currency that nets to zero", async () => {
      mockDatabaseService.item.findMany.mockResolvedValue([item("i1")]);

      await service.create("alice", {
        ...baseInput,
        offering: [{ itemId: "i1" }],
        coin: [
          { currencyId: "cur1", amount: 250, fromProposer: true },
          { currencyId: "cur1", amount: 250, fromProposer: false },
        ],
      });

      expect(lastCreate().currencyLines.create).toEqual([]);
    });

    it("refuses a fractional amount", async () => {
      await expect(
        service.create("alice", {
          ...baseInput,
          coin: [{ currencyId: "cur1", amount: 1.5, fromProposer: true }],
        }),
      ).rejects.toThrow(/whole and positive/i);
    });
  });

  describe("responding", () => {
    const pending = {
      id: "t1",
      communityId: "comm1",
      proposerId: "alice",
      recipientId: "bob",
      status: TradeStatus.PENDING,
      expiresAt: new Date(Date.now() + 86_400_000),
      items: [],
      currencyLines: [],
    };

    it("refuses an accept from anyone but the recipient", async () => {
      mockDatabaseService.trade.findUnique.mockResolvedValue(pending);
      await expect(service.accept("t1", "carol")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("refuses a decline from anyone but the recipient", async () => {
      mockDatabaseService.trade.findUnique.mockResolvedValue(pending);
      await expect(service.decline("t1", "alice")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("refuses a cancel from anyone but the proposer", async () => {
      mockDatabaseService.trade.findUnique.mockResolvedValue(pending);
      await expect(service.cancel("t1", "bob")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("refuses to answer a trade that already closed", async () => {
      mockDatabaseService.trade.findUnique.mockResolvedValue({
        ...pending,
        status: TradeStatus.DECLINED,
      });
      await expect(service.accept("t1", "bob")).rejects.toThrow(
        /already been answered/i,
      );
    });

    it("refuses to settle an expired offer", async () => {
      const expired = {
        ...pending,
        expiresAt: new Date(Date.now() - 1_000),
      };
      mockDatabaseService.trade.findUnique.mockResolvedValue(expired);
      mockDatabaseService.trade.findUnique.mockResolvedValueOnce(expired);

      // Expiry is a date, so nothing has written EXPIRED to the row -- the
      // check has to consult the clock.
      await expect(service.accept("t1", "bob")).rejects.toThrow(/expired/i);
    });
  });
});
