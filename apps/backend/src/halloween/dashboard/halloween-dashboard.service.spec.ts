import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  HalloweenDashboardService,
  prizeDelivery,
} from "./halloween-dashboard.service";
import {
  HalloweenPrizeDelivery,
  HalloweenWinFilter,
} from "./halloween-dashboard.types";
import { DatabaseService } from "../../database/database.service";
import { PrizeImageService } from "../services/prize-image.service";

const GUILD = "100000000000000001";

describe("prizeDelivery", () => {
  it("names how each kind of prize is delivered", () => {
    expect(prizeDelivery({ itemTypeId: "it", characterId: null })).toBe(
      HalloweenPrizeDelivery.CHARDB_ITEM,
    );
    expect(prizeDelivery({ itemTypeId: null, characterId: "ch" })).toBe(
      HalloweenPrizeDelivery.CHARDB_CHARACTER,
    );
    expect(prizeDelivery({ itemTypeId: null, characterId: null })).toBe(
      HalloweenPrizeDelivery.STAFF,
    );
  });
});

describe("HalloweenDashboardService", () => {
  let db: {
    community: { findUnique: jest.Mock };
    halloweenKnockEvent: { findUnique: jest.Mock; update: jest.Mock };
  };
  let service: HalloweenDashboardService;

  const staffPrize = { id: "adopt", itemTypeId: null, characterId: null };

  beforeEach(() => {
    db = {
      community: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ halloweenEnabled: true, discordGuildId: GUILD }),
      },
      halloweenKnockEvent: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          guildId: GUILD,
          userId: "u",
          prize: staffPrize,
        }),
        update: jest.fn(),
      },
    };
    service = new HalloweenDashboardService(
      db as unknown as DatabaseService,
      {
        imagesFor: () => Promise.resolve(new Map()),
      } as unknown as PrizeImageService,
    );
  });

  it("refuses a community the event is not enabled for", async () => {
    db.community.findUnique.mockResolvedValue({
      halloweenEnabled: false,
      discordGuildId: GUILD,
    });
    await expect(service.getDashboard("c")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      service.setDelivered("c", 1, true, "admin"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuses a community that does not exist", async () => {
    db.community.findUnique.mockResolvedValue(null);
    await expect(service.getDashboard("c")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("returns an empty dashboard before a Discord server is linked", async () => {
    db.community.findUnique.mockResolvedValue({
      halloweenEnabled: true,
      discordGuildId: null,
    });
    await expect(service.getDashboard("c")).resolves.toMatchObject({
      guildId: null,
      prizes: [],
      summary: { wins: 0, toDeliver: 0 },
    });
    await expect(
      service.getWins("c", HalloweenWinFilter.ALL, 50, 0),
    ).resolves.toEqual({ wins: [], total: 0, hasMore: false });
  });

  describe("getWins", () => {
    beforeEach(() => {
      Object.assign(db.halloweenKnockEvent, {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      });
      Object.assign(db, {
        halloweenDeviantArtUser: { findMany: jest.fn().mockResolvedValue([]) },
        externalAccount: { findMany: jest.fn().mockResolvedValue([]) },
        communityMember: { findMany: jest.fn().mockResolvedValue([]) },
      });
    });

    it("never returns more than 100 wins in a page", async () => {
      await service.getWins("c", HalloweenWinFilter.ALL, 5000, 0);
      expect(
        (db.halloweenKnockEvent as unknown as { findMany: jest.Mock }).findMany,
      ).toHaveBeenCalledWith(expect.objectContaining({ take: 100, skip: 0 }));
    });
  });

  describe("setDelivered", () => {
    it("refuses a knock from another server", async () => {
      db.halloweenKnockEvent.findUnique.mockResolvedValue({
        id: 1,
        guildId: "999",
        prize: staffPrize,
      });
      await expect(service.setDelivered("c", 1, true, "admin")).rejects.toThrow(
        new NotFoundException("No such win in this community"),
      );
    });

    it("refuses a losing knock", async () => {
      db.halloweenKnockEvent.findUnique.mockResolvedValue({
        id: 1,
        guildId: GUILD,
        prize: null,
      });
      await expect(
        service.setDelivered("c", 1, true, "admin"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("refuses a chardb prize", async () => {
      db.halloweenKnockEvent.findUnique.mockResolvedValue({
        id: 1,
        guildId: GUILD,
        prize: { id: "candy", itemTypeId: "it", characterId: null },
      });
      await expect(
        service.setDelivered("c", 1, true, "admin"),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.halloweenKnockEvent.update).not.toHaveBeenCalled();
    });
  });
});
