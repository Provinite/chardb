import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { Prisma, CurrencyTransactionKind } from "@chardb/database";
import { CurrenciesService } from "./currencies.service";
import { DatabaseService } from "../database/database.service";
import { mockDatabaseService } from "../../test/setup";

/** A Prisma unique-constraint error naming the index that was violated. */
const uniqueViolation = (target: string) =>
  new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "5.22.0",
    meta: { target },
  });

describe("CurrenciesService", () => {
  let service: CurrenciesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrenciesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<CurrenciesService>(CurrenciesService);
  });

  describe("create", () => {
    beforeEach(() => {
      mockDatabaseService.currency.create.mockResolvedValue({ id: "cur1" });
    });

    /** The `data` handed to Prisma on the last create. */
    const lastData = () =>
      (
        mockDatabaseService.currency.create.mock.calls.at(-1)?.[0] as {
          data: Record<string, unknown>;
        }
      ).data;

    it("stores the code uppercased", async () => {
      await service.create({
        communityId: "comm1",
        name: "Hollow Coin",
        code: "hc",
      });

      // Otherwise "hc" and "HC" both exist in one community and read as the
      // same thing on every surface that shows them.
      expect(lastData().code).toBe("HC");
    });

    it("trims whitespace and stores blank optionals as null", async () => {
      await service.create({
        communityId: "comm1",
        name: "  Hollow Coin  ",
        code: " hc ",
        symbol: "   ",
        description: "",
      });

      const data = lastData();
      expect(data.name).toBe("Hollow Coin");
      expect(data.code).toBe("HC");
      expect(data.symbol).toBeNull();
      expect(data.description).toBeNull();
    });

    it("names the code when a duplicate code collides", async () => {
      mockDatabaseService.currency.create.mockRejectedValue(
        uniqueViolation("currencies_community_id_code_key"),
      );

      // The raw Prisma message names a database index, which tells a member
      // filling in a form nothing about which field to change.
      await expect(
        service.create({ communityId: "comm1", name: "Gems", code: "hc" }),
      ).rejects.toThrow(/code HC/);
    });

    it("names the name when a duplicate name collides", async () => {
      mockDatabaseService.currency.create.mockRejectedValue(
        uniqueViolation("currencies_community_id_name_key"),
      );

      await expect(
        service.create({
          communityId: "comm1",
          name: "Hollow Coin",
          code: "XX",
        }),
      ).rejects.toThrow(/named Hollow Coin/);
    });

    it("lets an unrelated error through unchanged", async () => {
      mockDatabaseService.currency.create.mockRejectedValue(
        new Error("connection terminated unexpectedly"),
      );

      await expect(
        service.create({ communityId: "comm1", name: "Gems", code: "GEM" }),
      ).rejects.toThrow(/connection terminated/);
    });
  });

  describe("update", () => {
    beforeEach(() => {
      mockDatabaseService.currency.findUnique.mockResolvedValue({
        id: "cur1",
        name: "Hollow Coin",
        code: "HC",
      });
      mockDatabaseService.currency.update.mockResolvedValue({ id: "cur1" });
    });

    const lastData = () =>
      (
        mockDatabaseService.currency.update.mock.calls.at(-1)?.[0] as {
          data: Record<string, unknown>;
        }
      ).data;

    it("touches only the fields that were supplied", async () => {
      await service.update("cur1", { name: "Hollow Mark" });

      expect(Object.keys(lastData())).toEqual(["name"]);
    });

    it("archiving stamps a date and restoring clears it", async () => {
      await service.update("cur1", { archived: true });
      expect(lastData().archivedAt).toBeInstanceOf(Date);

      await service.update("cur1", { archived: false });
      expect(lastData().archivedAt).toBeNull();
    });

    it("clearing the colour disconnects rather than writing null", async () => {
      await service.update("cur1", { colorId: undefined });
      expect(lastData().color).toBeUndefined();
    });

    it("refuses a currency that does not exist", async () => {
      mockDatabaseService.currency.findUnique.mockResolvedValue(null);

      await expect(service.update("gone", { name: "x" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("reports a collision against the incoming code, not the stored one", async () => {
      mockDatabaseService.currency.update.mockRejectedValue(
        uniqueViolation("currencies_community_id_code_key"),
      );

      await expect(service.update("cur1", { code: "gem" })).rejects.toThrow(
        /code GEM/,
      );
    });

    it("surfaces a conflict as a ConflictException", async () => {
      mockDatabaseService.currency.update.mockRejectedValue(
        uniqueViolation("currencies_community_id_name_key"),
      );

      await expect(service.update("cur1", { name: "Gems" })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("findSupply", () => {
    const currencies = [
      { id: "cur1", name: "Hollow Coin", archivedAt: null },
      { id: "cur2", name: "Festival Token", archivedAt: null },
    ];

    beforeEach(() => {
      mockDatabaseService.currency.findMany.mockResolvedValue(currencies);
      mockDatabaseService.currencyBalance.groupBy.mockResolvedValue([]);
      mockDatabaseService.currencyTransaction.groupBy.mockResolvedValue([]);
    });

    it("returns a row per currency even when nothing has ever moved", async () => {
      const supply = await service.findSupply("comm1");

      expect(supply).toHaveLength(2);
      expect(supply[0]).toMatchObject({
        inCirculation: 0,
        holders: 0,
        mintedLast30Days: 0,
        removedLast30Days: 0,
        largestBalance: 0,
      });
    });

    it("reports removals as a positive magnitude", async () => {
      mockDatabaseService.currencyTransaction.groupBy.mockResolvedValue([
        {
          currencyId: "cur1",
          kind: CurrencyTransactionKind.BURN,
          _sum: { amount: -300 },
        },
        {
          currencyId: "cur1",
          kind: CurrencyTransactionKind.SPEND,
          _sum: { amount: -100 },
        },
      ]);

      const supply = await service.findSupply("comm1");

      // Stored negative; "removed: -400" reads as a double negative wherever
      // it is shown. Burns and spends are added together -- both leave
      // circulation.
      expect(supply[0].removedLast30Days).toBe(400);
    });

    it("ignores transfers, which change nothing about the supply", async () => {
      mockDatabaseService.currencyTransaction.groupBy.mockResolvedValue([
        {
          currencyId: "cur1",
          kind: CurrencyTransactionKind.TRANSFER,
          _sum: { amount: 0 },
        },
      ]);

      const supply = await service.findSupply("comm1");

      expect(supply[0].mintedLast30Days).toBe(0);
      expect(supply[0].removedLast30Days).toBe(0);
    });

    it("counts holders separately from circulation", async () => {
      mockDatabaseService.currencyBalance.groupBy
        .mockResolvedValueOnce([{ currencyId: "cur1", _sum: { amount: 900 } }])
        .mockResolvedValueOnce([{ currencyId: "cur1", _count: { _all: 3 } }])
        .mockResolvedValueOnce([{ currencyId: "cur1", _max: { amount: 500 } }]);

      const supply = await service.findSupply("comm1");

      // 900 held across 3 people, one of whom holds 500. Circulation is not a
      // headcount and a headcount is not circulation.
      expect(supply[0]).toMatchObject({
        inCirculation: 900,
        holders: 3,
        largestBalance: 500,
      });
    });

    it("does not query at all when the community has no currencies", async () => {
      mockDatabaseService.currency.findMany.mockResolvedValue([]);

      expect(await service.findSupply("comm1")).toEqual([]);
      expect(
        mockDatabaseService.currencyBalance.groupBy,
      ).not.toHaveBeenCalled();
    });

    it("includes archived currencies, which still hold balances", async () => {
      await service.findSupply("comm1");

      // An archived currency takes no new transactions but the coin already
      // in members' hands does not vanish, so leaving it out of the supply
      // report would understate what exists.
      const call = mockDatabaseService.currency.findMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(call.where).not.toHaveProperty("archivedAt");
    });
  });

  describe("findByCommunity", () => {
    it("hides archived currencies by default", async () => {
      mockDatabaseService.currency.findMany.mockResolvedValue([]);

      await service.findByCommunity("comm1");

      const call = mockDatabaseService.currency.findMany.mock.calls[0][0] as {
        where: { archivedAt: null };
      };
      expect(call.where.archivedAt).toBeNull();
    });

    it("sorts live currencies above archived ones", async () => {
      mockDatabaseService.currency.findMany.mockResolvedValue([]);

      await service.findByCommunity("comm1", true);

      // A plain `archivedAt: "asc"` sorts archived to the TOP, because a live
      // currency's archivedAt is null and Postgres puts nulls last ascending.
      // That buried the currency a community actually uses underneath the one
      // it retired -- caught by looking at the page, not by a passing test.
      const call = mockDatabaseService.currency.findMany.mock.calls[0][0] as {
        orderBy: Array<Record<string, unknown>>;
      };
      expect(call.orderBy[0]).toEqual({
        archivedAt: { sort: "asc", nulls: "first" },
      });
      expect(call.orderBy[1]).toEqual({ name: "asc" });
    });
  });
});
