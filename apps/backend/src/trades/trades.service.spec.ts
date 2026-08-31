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
    mockDatabaseService.tradeCurrencyLine.aggregate.mockResolvedValue({
      _sum: { amount: null },
    });
    mockDatabaseService.currencyBalance.findUnique.mockResolvedValue({
      amount: 1_000_000,
      currency: { code: "HC" },
    });
    mockDatabaseService.trade.create.mockResolvedValue({
      id: "t1",
      items: [],
      characterLines: [],
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
    offeringCharacters: [],
    requestingCharacters: [],
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
      mockDatabaseService.currency.findMany.mockResolvedValue([
        { id: "cur1", name: "Hollow Coin", isTradeable: true },
      ]);
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

    it("refuses an untradeable currency", async () => {
      mockDatabaseService.currency.findMany.mockResolvedValue([
        { id: "cur1", name: "Prompt Points", isTradeable: false },
      ]);

      // Named specifically. The lookup above it also refuses a currency from
      // another community, and "does not belong here, or is archived" sends
      // someone to a different place than "cannot be traded" does.
      await expect(
        service.create("alice", {
          ...baseInput,
          coin: [{ currencyId: "cur1", amount: 100, fromProposer: true }],
        }),
      ).rejects.toThrow(/Prompt Points cannot be traded/i);
    });

    it("refuses to promise coin the proposer does not have", async () => {
      mockDatabaseService.currencyBalance.findUnique.mockResolvedValue({
        amount: 80,
        currency: { code: "HC" },
      });

      await expect(
        service.create("alice", {
          ...baseInput,
          coin: [{ currencyId: "cur1", amount: 300, fromProposer: true }],
        }),
      ).rejects.toThrow(/do not have 300 HC/i);
    });

    it("counts coin already promised in the proposer's other open offers", async () => {
      mockDatabaseService.currencyBalance.findUnique.mockResolvedValue({
        amount: 380,
        currency: { code: "HC" },
      });
      mockDatabaseService.tradeCurrencyLine.aggregate.mockResolvedValue({
        _sum: { amount: 300 },
      });

      // The counterpart to the item double-promise check. 300 of the 380 is
      // spoken for, so this offer cannot settle however healthy the balance
      // looks -- and the message has to say so, or the member goes to their
      // wallet rather than to the offers they have forgotten about.
      await expect(
        service.create("alice", {
          ...baseInput,
          coin: [{ currencyId: "cur1", amount: 200, fromProposer: true }],
        }),
      ).rejects.toThrow(/300 of your 380 is already promised/i);
    });

    it("leaves what the recipient owes unchecked", async () => {
      mockDatabaseService.currencyBalance.findUnique.mockResolvedValue({
        amount: 0,
        currency: { code: "HC" },
      });

      // Asking for more than they hold today is not an error: their balance is
      // theirs to change before answering, exactly as their holdings are for a
      // by-type request. Accept is where it has to be true.
      await expect(
        service.create("alice", {
          ...baseInput,
          coin: [{ currencyId: "cur1", amount: 500, fromProposer: false }],
        }),
      ).resolves.toBeDefined();
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
      characterLines: [],
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

  /**
   * Settlement is where the guards have to hold.
   *
   * Everything compose time checks is advisory: nothing is escrowed, so any of
   * it can stop being true while the offer sits. These drive `accept` far
   * enough into the transaction to exercise the checks that actually decide
   * whether property moves, which the tests above stop short of.
   */
  describe("settlement", () => {
    /** One potion of `type1` going from alice to bob, for 120 coin back. */
    const settling = {
      id: "t1",
      communityId: "comm1",
      proposerId: "alice",
      recipientId: "bob",
      status: TradeStatus.PENDING,
      expiresAt: new Date(Date.now() + 86_400_000),
      items: [
        {
          id: "line1",
          itemId: "i1",
          itemTypeId: null,
          quantity: null,
          sourceUserId: "alice",
          destinationUserId: "bob",
          item: { itemTypeId: "type1", itemType: { name: "Potion" } },
          itemType: null,
        },
      ],
      characterLines: [],
      currencyLines: [
        {
          id: "coin1",
          currencyId: "cur1",
          amount: 120,
          sourceUserId: "bob",
          destinationUserId: "alice",
          currency: { code: "HC" },
        },
      ],
    };

    beforeEach(() => {
      mockDatabaseService.trade.findUnique.mockResolvedValue(settling);
      // Nothing has been locked, the row is still alice's, and bob is good for
      // the coin. Each test spoils exactly one of those. The two findMany
      // stubs return the locked rows, so empty means nothing is locked.
      mockDatabaseService.itemType.findMany.mockResolvedValue([]);
      mockDatabaseService.currency.findMany.mockResolvedValue([]);
      mockDatabaseService.item.updateMany.mockResolvedValue({ count: 1 });
      mockDatabaseService.currencyBalance.findUnique.mockResolvedValue({
        amount: 500,
        currency: { code: "HC" },
      });
      mockDatabaseService.trade.update.mockResolvedValue({
        ...settling,
        status: TradeStatus.ACCEPTED,
      });
    });

    it("settles items and coin on one batch id", async () => {
      await service.accept("t1", "bob");

      const itemBatch = (
        mockItemTransactions.recordBatch.mock.calls[0][0] as {
          batchId: string;
        }
      ).batchId;
      const coinBatch = (
        mockCurrencyLedger.transfer.mock.calls[0][2] as { batchId: string }
      ).batchId;

      // One event, two ledgers. A settlement that could not be recognised as
      // one thing across both is a settlement nobody can audit.
      expect(itemBatch).toBe(coinBatch);
      expect(
        (
          mockDatabaseService.trade.update.mock.calls[0][0] as {
            data: { settlementBatchId: string };
          }
        ).data.settlementBatchId,
      ).toBe(itemBatch);
    });

    it("refuses a type locked after the offer was written", async () => {
      mockDatabaseService.itemType.findMany.mockResolvedValue([
        { name: "Potion" },
      ]);

      // Compose time already refused untradeable types. Staff locking one is
      // most likely precisely while offers are open, and trusting the earlier
      // check would settle every one of them through the decision.
      await expect(service.accept("t1", "bob")).rejects.toThrow(
        /can no longer be traded/i,
      );
      expect(mockCurrencyLedger.transfer).not.toHaveBeenCalled();
    });

    it("refuses a currency locked after the offer was written", async () => {
      mockDatabaseService.currency.findMany.mockResolvedValue([
        { name: "Hollow Coin" },
      ]);

      // transfer() refuses an untradeable currency on its own, so the trade
      // would fail either way -- but only after the items had already moved
      // inside the transaction, and with a message about sending coin rather
      // than about this trade. Checked here, nothing moves at all.
      await expect(service.accept("t1", "bob")).rejects.toThrow(
        /Hollow Coin can no longer be traded/i,
      );
      expect(mockDatabaseService.item.updateMany).not.toHaveBeenCalled();
      expect(mockCurrencyLedger.transfer).not.toHaveBeenCalled();
    });

    it("refuses when the offered row has moved on", async () => {
      mockDatabaseService.item.updateMany.mockResolvedValue({ count: 0 });

      // The update carries ownership and type in its WHERE rather than
      // checking first and writing after, so a concurrent transfer loses the
      // race instead of being silently overwritten by this one.
      await expect(service.accept("t1", "bob")).rejects.toThrow(
        /no longer available/i,
      );
      expect(mockCurrencyLedger.transfer).not.toHaveBeenCalled();
    });

    it("names the accepter when the accepter is short of coin", async () => {
      mockDatabaseService.currencyBalance.findUnique.mockResolvedValue({
        amount: 10,
        currency: { code: "HC" },
      });

      await expect(service.accept("t1", "bob")).rejects.toThrow(
        /You do not have 120 HC/i,
      );
    });

    it("names the other side when the proposer is short of coin", async () => {
      mockDatabaseService.trade.findUnique.mockResolvedValue({
        ...settling,
        currencyLines: [
          { ...settling.currencyLines[0], sourceUserId: "alice" },
        ],
      });
      mockDatabaseService.currencyBalance.findUnique.mockResolvedValue({
        amount: 10,
        currency: { code: "HC" },
      });

      // The ledger phrases a shortfall as "You do not have...", addressed to
      // whoever called it -- which here is the recipient, who is receiving.
      // Told that, they would go and look at a wallet that is perfectly fine.
      await expect(service.accept("t1", "bob")).rejects.toThrow(
        /member who made this offer no longer has 120 HC/i,
      );
    });
  });

  describe("counter", () => {
    const pending = {
      id: "t1",
      communityId: "comm1",
      proposerId: "alice",
      recipientId: "bob",
      status: TradeStatus.PENDING,
      expiresAt: new Date(Date.now() + 86_400_000),
      items: [],
      characterLines: [],
      currencyLines: [],
    };

    const counterInput = {
      communityId: "comm1",
      recipientId: "alice",
      offering: [],
      requesting: [],
      offeringCharacters: [],
      requestingCharacters: [],
      coin: [{ currencyId: "cur1", amount: 50, fromProposer: true }],
    };

    beforeEach(() => {
      mockDatabaseService.trade.findUnique.mockResolvedValue(pending);
      mockDatabaseService.currency.findMany.mockResolvedValue([
        { id: "cur1", name: "Hollow Coin", isTradeable: true },
      ]);
      mockDatabaseService.trade.updateMany.mockResolvedValue({ count: 1 });
    });

    it("declines the original and creates the replacement together", async () => {
      await service.counter("bob", "t1", counterInput);

      // One step, so abandoning the composer cannot leave the member with
      // neither offer. The decline is conditional on PENDING so a race with
      // the proposer withdrawing loses rather than closing a closed trade.
      expect(mockDatabaseService.trade.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "t1", status: TradeStatus.PENDING },
          data: expect.objectContaining({ status: TradeStatus.DECLINED }),
        }),
      );
      expect(mockDatabaseService.trade.create).toHaveBeenCalled();
    });

    it("refuses a counter from anyone but the recipient", async () => {
      await expect(
        service.counter("carol", "t1", counterInput),
      ).rejects.toThrow(ForbiddenException);
      expect(mockDatabaseService.trade.updateMany).not.toHaveBeenCalled();
    });

    it("declines nothing when the replacement is refused", async () => {
      mockDatabaseService.currencyBalance.findUnique.mockResolvedValue({
        amount: 10,
        currency: { code: "HC" },
      });

      // The whole point of doing both at once: an offer that cannot be sent
      // must not have cost the member the one they were answering.
      await expect(service.counter("bob", "t1", counterInput)).rejects.toThrow(
        /do not have 50 HC/i,
      );
      expect(mockDatabaseService.trade.updateMany).not.toHaveBeenCalled();
    });

    it("refuses to counter an offer that closed while it was being written", async () => {
      mockDatabaseService.trade.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.counter("bob", "t1", counterInput)).rejects.toThrow(
        /no longer open/i,
      );
    });

    it("refuses a counter aimed somewhere else", async () => {
      await expect(
        service.counter("bob", "t1", { ...counterInput, recipientId: "carol" }),
      ).rejects.toThrow(/goes back to the member who made the offer/i);
    });
  });
});
