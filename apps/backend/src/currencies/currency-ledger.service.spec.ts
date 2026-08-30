import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CurrencyTransactionKind } from "@chardb/database";
import { CurrencyLedgerService } from "./currency-ledger.service";
import { DatabaseService } from "../database/database.service";
import { mockDatabaseService } from "../../test/setup";

/** The shape the service writes into currency_transactions. */
interface LedgerRow {
  currencyId: string;
  userId: string;
  kind: CurrencyTransactionKind;
  amount: number;
  balanceAfter: number;
  batchId: string;
  counterpartyId?: string | null;
  actorUserId?: string | null;
  actorLabel?: string | null;
  reason?: string | null;
  staffNote?: string | null;
}

/** Every ledger row written during the test, in the order they were written. */
const writtenRows = (): LedgerRow[] => {
  const singles = mockDatabaseService.currencyTransaction.create.mock.calls.map(
    (call) => (call[0] as { data: LedgerRow }).data,
  );
  const batched =
    mockDatabaseService.currencyTransaction.createMany.mock.calls.flatMap(
      (call) => (call[0] as { data: LedgerRow[] }).data,
    );
  return [...singles, ...batched];
};

/** The order balances were touched, as (userId, delta) pairs. */
const balanceWrites = (): Array<{ userId: string; delta: number }> =>
  mockDatabaseService.currencyBalance.update.mock.calls.map((call) => {
    const arg = call[0] as {
      where: { currencyId_userId: { userId: string } };
      data: { amount: { increment: number } };
    };
    return {
      userId: arg.where.currencyId_userId.userId,
      delta: arg.data.amount.increment,
    };
  });

describe("CurrencyLedgerService", () => {
  let service: CurrencyLedgerService;

  const currency = {
    id: "cur1",
    communityId: "comm1",
    name: "Hollow Coin",
    code: "HC",
    archivedAt: null,
  };

  /** Make every balance update report this as the resulting amount. */
  const balanceBecomes = (amount: number) => {
    mockDatabaseService.currencyBalance.update.mockResolvedValue({ amount });
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrencyLedgerService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<CurrencyLedgerService>(CurrencyLedgerService);

    mockDatabaseService.currency.findUnique.mockResolvedValue(currency);
    mockDatabaseService.currencyBalance.createMany.mockResolvedValue({
      count: 1,
    });
    mockDatabaseService.currencyTransaction.create.mockResolvedValue({});
    mockDatabaseService.currencyTransaction.createMany.mockResolvedValue({
      count: 2,
    });
    // Everyone named is a member unless a test says otherwise.
    mockDatabaseService.communityMember.findMany.mockImplementation(
      (args: { where: { userId: { in: string[] } } }) =>
        Promise.resolve(args.where.userId.in.map((userId) => ({ userId }))),
    );
    balanceBecomes(100);
  });

  describe("mint", () => {
    it("writes one ledger row per recipient, all sharing a batch id", async () => {
      const batchId = await service.mint(
        {
          currencyId: "cur1",
          userIds: ["userA", "userB", "userC"],
          amount: 50,
          reason: "Placed in the summer prompt",
        },
        "staff1",
      );

      const rows = writtenRows();
      expect(rows).toHaveLength(3);
      expect(new Set(rows.map((r) => r.batchId))).toEqual(new Set([batchId]));
      expect(rows.every((r) => r.kind === CurrencyTransactionKind.MINT)).toBe(
        true,
      );
      expect(rows.every((r) => r.amount === 50)).toBe(true);
      expect(rows.map((r) => r.userId).sort()).toEqual([
        "userA",
        "userB",
        "userC",
      ]);
    });

    it("records the balance the increment actually returned", async () => {
      balanceBecomes(175);

      await service.mint(
        {
          currencyId: "cur1",
          userIds: ["userA"],
          amount: 75,
          reason: "Prompt reward",
        },
        "staff1",
      );

      expect(writtenRows()[0].balanceAfter).toBe(175);
    });

    it("deduplicates a recipient list so nobody is paid twice", async () => {
      await service.mint(
        {
          currencyId: "cur1",
          userIds: ["userA", "userA", "userB"],
          amount: 10,
          reason: "Event payout",
        },
        "staff1",
      );

      expect(writtenRows()).toHaveLength(2);
    });

    it("touches balances in a fixed order regardless of the input order", async () => {
      await service.mint(
        {
          currencyId: "cur1",
          userIds: ["userC", "userA", "userB"],
          amount: 10,
          reason: "Event payout",
        },
        "staff1",
      );

      // Sorted, not as supplied. Two concurrent bulk mints over overlapping
      // recipients would otherwise take the same row locks in different
      // orders and deadlock each other.
      expect(balanceWrites().map((w) => w.userId)).toEqual([
        "userA",
        "userB",
        "userC",
      ]);
    });

    it("opens balance rows before the transaction, not inside it", async () => {
      await service.mint(
        {
          currencyId: "cur1",
          userIds: ["userA"],
          amount: 10,
          reason: "Event payout",
        },
        "staff1",
      );

      // ON CONFLICT DO NOTHING, so two callers racing to open the same
      // member's first balance both succeed. Inside the transaction the loser
      // would hit a unique violation and abort unrelated work.
      const call =
        mockDatabaseService.currencyBalance.createMany.mock.calls[0][0];
      expect((call as { skipDuplicates: boolean }).skipDuplicates).toBe(true);
    });

    it("carries the staff note through to the ledger", async () => {
      await service.mint(
        {
          currencyId: "cur1",
          userIds: ["userA"],
          amount: 10,
          reason: "Prompt reward",
          staffNote: "Manual correction after the bot double-paid",
        },
        "staff1",
      );

      expect(writtenRows()[0].staffNote).toBe(
        "Manual correction after the bot double-paid",
      );
    });

    it("labels a system actor when no user performed it", async () => {
      await service.mint(
        {
          currencyId: "cur1",
          userIds: ["userA"],
          amount: 10,
          reason: "Discord prize",
        },
        null,
        "discord-bot",
      );

      const row = writtenRows()[0];
      expect(row.actorUserId).toBeNull();
      expect(row.actorLabel).toBe("discord-bot");
    });

    it("never sets both an actor user and an actor label", async () => {
      await service.mint(
        {
          currencyId: "cur1",
          userIds: ["userA"],
          amount: 10,
          reason: "Prompt reward",
        },
        "staff1",
        "discord-bot",
      );

      const row = writtenRows()[0];
      expect(row.actorUserId).toBe("staff1");
      expect(row.actorLabel).toBeNull();
    });

    it("refuses a currency that does not exist", async () => {
      mockDatabaseService.currency.findUnique.mockResolvedValue(null);

      await expect(
        service.mint(
          {
            currencyId: "missing",
            userIds: ["userA"],
            amount: 10,
            reason: "x",
          },
          "staff1",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("refuses an archived currency", async () => {
      mockDatabaseService.currency.findUnique.mockResolvedValue({
        ...currency,
        archivedAt: new Date(),
      });

      await expect(
        service.mint(
          { currencyId: "cur1", userIds: ["userA"], amount: 10, reason: "x" },
          "staff1",
        ),
      ).rejects.toThrow(/archived/i);
    });

    it("refuses to pay someone who is not a member of the community", async () => {
      mockDatabaseService.communityMember.findMany.mockResolvedValue([
        { userId: "userA" },
      ]);

      await expect(
        service.mint(
          {
            currencyId: "cur1",
            userIds: ["userA", "outsider"],
            amount: 10,
            reason: "x",
          },
          "staff1",
        ),
      ).rejects.toThrow(/outsider/);

      // And nothing was written -- the check runs before any balance moves.
      expect(writtenRows()).toHaveLength(0);
      expect(balanceWrites()).toHaveLength(0);
    });
  });

  describe("burn", () => {
    it("writes a negative amount", async () => {
      balanceBecomes(40);

      await service.burn(
        {
          currencyId: "cur1",
          userId: "userA",
          amount: 60,
          reason: "Reversed a duplicate payout",
        },
        "staff1",
      );

      const row = writtenRows()[0];
      expect(row.kind).toBe(CurrencyTransactionKind.BURN);
      expect(row.amount).toBe(-60);
      expect(row.balanceAfter).toBe(40);
      expect(balanceWrites()).toEqual([{ userId: "userA", delta: -60 }]);
    });

    it("turns a constraint violation into a readable overdraft error", async () => {
      // This message is not invented. It was captured from the real database:
      // Prisma surfaces a CHECK violation as PrismaClientUnknownRequestError
      // with *no* `code` field, so matching on the constraint name in the
      // message is the only handle available. Matching on a Prisma error code
      // would compile, pass a mocked test, and then fail silently in
      // production by showing members a raw database error.
      mockDatabaseService.currencyBalance.update.mockRejectedValue(
        new Error(
          'new row for relation "currency_balances" violates check ' +
            'constraint "currency_balances_amount_non_negative"',
        ),
      );

      await expect(
        service.burn(
          {
            currencyId: "cur1",
            userId: "userA",
            amount: 999,
            reason: "Correction",
          },
          "staff1",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("lets an unrelated database error through unchanged", async () => {
      mockDatabaseService.currencyBalance.update.mockRejectedValue(
        new Error("connection terminated unexpectedly"),
      );

      await expect(
        service.burn(
          {
            currencyId: "cur1",
            userId: "userA",
            amount: 10,
            reason: "Correction",
          },
          "staff1",
        ),
      ).rejects.toThrow(/connection terminated/);
    });
  });

  describe("transfer", () => {
    it("writes both sides as one batch with opposite signs", async () => {
      const batchId = await service.transfer(
        {
          currencyId: "cur1",
          toUserId: "userB",
          amount: 25,
          reason: "For the adopt",
        },
        "userA",
      );

      const rows = writtenRows();
      expect(rows).toHaveLength(2);
      expect(new Set(rows.map((r) => r.batchId))).toEqual(new Set([batchId]));

      const sender = rows.find((r) => r.userId === "userA");
      const recipient = rows.find((r) => r.userId === "userB");
      expect(sender?.amount).toBe(-25);
      expect(recipient?.amount).toBe(25);
      expect(sender?.counterpartyId).toBe("userB");
      expect(recipient?.counterpartyId).toBe("userA");
      // Both sides record the sender as the actor: the recipient did not act.
      expect(rows.every((r) => r.actorUserId === "userA")).toBe(true);
    });

    it("touches the two balances in user-id order, not sender-first", async () => {
      // "userA" sorts before "userZ", so a transfer in either direction takes
      // the locks in the same order. Without this, A paying Z while Z pays A
      // has each transaction holding the row the other needs, and Postgres
      // resolves it by killing one of them.
      await service.transfer(
        { currencyId: "cur1", toUserId: "userA", amount: 5 },
        "userZ",
      );

      expect(balanceWrites()).toEqual([
        { userId: "userA", delta: 5 },
        { userId: "userZ", delta: -5 },
      ]);
    });

    it("records each side's own resulting balance", async () => {
      mockDatabaseService.currencyBalance.update
        .mockResolvedValueOnce({ amount: 30 }) // userA, sorted first
        .mockResolvedValueOnce({ amount: 70 }); // userB

      await service.transfer(
        { currencyId: "cur1", toUserId: "userB", amount: 20 },
        "userA",
      );

      const rows = writtenRows();
      expect(rows.find((r) => r.userId === "userA")?.balanceAfter).toBe(30);
      expect(rows.find((r) => r.userId === "userB")?.balanceAfter).toBe(70);
    });

    it("refuses a transfer to yourself", async () => {
      await expect(
        service.transfer(
          { currencyId: "cur1", toUserId: "userA", amount: 5 },
          "userA",
        ),
      ).rejects.toThrow(/yourself/i);
    });

    it("refuses to send to someone outside the community", async () => {
      mockDatabaseService.communityMember.findMany.mockResolvedValue([
        { userId: "userA" },
      ]);

      await expect(
        service.transfer(
          { currencyId: "cur1", toUserId: "outsider", amount: 5 },
          "userA",
        ),
      ).rejects.toThrow(/outsider/);
    });

    it("reports an overdraft in the sender's own terms", async () => {
      mockDatabaseService.currencyBalance.update.mockRejectedValue(
        new Error(
          'violates check constraint "currency_balances_amount_non_negative"',
        ),
      );

      await expect(
        service.transfer(
          { currencyId: "cur1", toUserId: "userB", amount: 500 },
          "userA",
        ),
      ).rejects.toThrow(/You do not have 500 HC/);
    });
  });

  describe("spend", () => {
    it("writes a negative SPEND row distinct from a staff burn", async () => {
      balanceBecomes(10);

      await service.spend("cur1", "userA", 40, "Bought a MYO slot");

      const row = writtenRows()[0];
      expect(row.kind).toBe(CurrencyTransactionKind.SPEND);
      expect(row.amount).toBe(-40);
      expect(row.actorUserId).toBe("userA");
    });

    it("refuses a non-positive amount", async () => {
      await expect(service.spend("cur1", "userA", 0, "Free")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("joins a caller's transaction rather than opening its own", async () => {
      const tx = {
        currencyBalance: { update: jest.fn().mockResolvedValue({ amount: 5 }) },
        currencyTransaction: { create: jest.fn().mockResolvedValue({}) },
      };

      // A shop purchase must commit the item and the payment together, so the
      // spend has to run inside the caller's transaction.
      await service.spend(
        "cur1",
        "userA",
        20,
        "Bought a MYO slot",
        tx as never,
      );

      expect(tx.currencyBalance.update).toHaveBeenCalled();
      expect(tx.currencyTransaction.create).toHaveBeenCalled();
      expect(mockDatabaseService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("findWallet", () => {
    it("includes currencies the member holds none of", async () => {
      mockDatabaseService.currency.findMany.mockResolvedValue([
        { id: "cur1", name: "Hollow Coin" },
        { id: "cur2", name: "Festival Token" },
      ]);
      mockDatabaseService.currencyBalance.findMany.mockResolvedValue([
        { currencyId: "cur1", amount: 120, updatedAt: new Date("2026-01-01") },
      ]);

      const wallet = await service.findWallet("comm1", "userA");

      // A wallet that hides zero balances cannot tell a member that a currency
      // exists, which is what they need to know before they can earn any.
      expect(wallet.balances).toHaveLength(2);
      expect(wallet.balances[1].amount).toBe(0);
      expect(wallet.balances[1].updatedAt).toBeNull();
    });
  });

  describe("findTransactions", () => {
    beforeEach(() => {
      mockDatabaseService.currencyTransaction.findMany.mockResolvedValue([]);
      mockDatabaseService.currencyTransaction.count.mockResolvedValue(0);
    });

    /** The `where` the service handed Prisma on the last query. */
    const lastWhere = () =>
      (
        mockDatabaseService.currencyTransaction.findMany.mock.calls.at(
          -1,
        )?.[0] as { where: Record<string, unknown> }
      ).where;

    it("never searches staff notes", async () => {
      await service.findTransactions({
        communityId: "comm1",
        search: "duplicate",
      });

      // Searching them would let a member probe for the contents of a note
      // they cannot read, one guess at a time.
      expect(JSON.stringify(lastWhere())).not.toContain("staffNote");
    });

    it("matches a user on any of the three roles a row can name", async () => {
      await service.findTransactions({
        communityId: "comm1",
        userId: "userA",
      });

      const where = lastWhere() as { OR: Array<Record<string, string>> };
      expect(where.OR).toEqual([
        { userId: "userA" },
        { counterpartyId: "userA" },
        { actorUserId: "userA" },
      ]);
    });

    it("scopes to the community through the currency relation", async () => {
      await service.findTransactions({ communityId: "comm1" });

      expect(lastWhere()).toMatchObject({
        currency: { communityId: "comm1" },
      });
    });

    it("reports hasMore against the true total, not the page size", async () => {
      mockDatabaseService.currencyTransaction.findMany.mockResolvedValue([
        {},
        {},
      ]);
      mockDatabaseService.currencyTransaction.count.mockResolvedValue(40);

      const result = await service.findTransactions({
        communityId: "comm1",
        limit: 2,
        offset: 0,
      });

      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(40);
    });
  });

  describe("findHolders", () => {
    it("excludes zero balances", async () => {
      mockDatabaseService.currencyBalance.findMany.mockResolvedValue([]);
      mockDatabaseService.currencyBalance.count.mockResolvedValue(0);

      await service.findHolders("cur1");

      // This answers "where did the coin go". Someone holding none is not
      // part of that answer, unlike in a wallet.
      const call = mockDatabaseService.currencyBalance.findMany.mock
        .calls[0][0] as { where: { amount: { gt: number } } };
      expect(call.where.amount).toEqual({ gt: 0 });
    });
  });
});
