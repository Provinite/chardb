import { ConflictException } from "@nestjs/common";
import { Prisma } from "@chardb/database";
import type { DatabaseService } from "../../database/database.service";
import type { NotificationsService } from "../../notifications/notifications.service";
import type { HalloweenDashboardService } from "../dashboard/halloween-dashboard.service";
import type { PlayerLock } from "../services/player-lock";
import { CandySwapService } from "./candy-swap.service";

const OFFER_ID = "00000000-0000-4000-8000-000000000001";

/** A swap service whose every transaction fails the way `failure` says. */
const serviceFailingWith = (failure: Error) =>
  new CandySwapService(
    {
      $transaction: jest.fn().mockRejectedValue(failure),
    } as unknown as DatabaseService,
    {
      linkedGuildFor: jest.fn().mockResolvedValue("guild"),
    } as unknown as HalloweenDashboardService,
    {} as PlayerLock,
    {} as NotificationsService,
  );

describe("CandySwapService under contention", () => {
  it.each([
    [
      "a lock it waited too long for",
      new Prisma.PrismaClientKnownRequestError("lock", {
        code: "P2010",
        clientVersion: "test",
        meta: { code: "55P03" },
      }),
    ],
    [
      "a transaction that could not start in time",
      new Prisma.PrismaClientKnownRequestError("timeout", {
        code: "P2028",
        clientVersion: "test",
      }),
    ],
  ])("answers busy for %s", async (_what, failure) => {
    const swap = serviceFailingWith(failure);

    for (const attempt of [
      () => swap.accept("community", "user", OFFER_ID),
      () => swap.cancel("community", "user", OFFER_ID),
      () => swap.place("community", "user", [1], "banana"),
    ]) {
      await expect(attempt()).rejects.toThrow(
        new ConflictException("The candy swap is busy. Try again in a moment."),
      );
    }
  });

  it("lets any other failure through as it is", async () => {
    const failure = new Error("something else");
    await expect(
      serviceFailingWith(failure).cancel("community", "user", OFFER_ID),
    ).rejects.toBe(failure);
  });
});
