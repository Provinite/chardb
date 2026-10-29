import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ExternalAccountProvider } from "@chardb/database";
import {
  DISCORD_NAME_BACKFILL_PACE_MS,
  DiscordNameBackfillService,
} from "./discord-name-backfill.service";
import { DatabaseService } from "../../database/database.service";
import { DiscordService } from "../../discord/discord.service";
import { mockDatabaseService } from "../../../test/setup";

const mockDiscordService = { getUserInfo: jest.fn() };

const NEO = "214000000000009071";
const GONE = "214000000000009072";

/**
 * Fills in the Discord names of pending owners recorded before names were
 * kept, so staff can find last year's event winners by them (#445).
 */
describe("DiscordNameBackfillService", () => {
  let service: DiscordNameBackfillService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordNameBackfillService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: DiscordService, useValue: mockDiscordService },
        // No pacing in tests.
        { provide: DISCORD_NAME_BACKFILL_PACE_MS, useValue: 0 },
      ],
    }).compile();
    service = module.get(DiscordNameBackfillService);

    mockDatabaseService.pendingOwnership.findMany.mockResolvedValue([
      { providerAccountId: NEO },
      { providerAccountId: GONE },
    ]);
    mockDatabaseService.pendingOwnership.updateMany.mockResolvedValue({
      count: 1,
    });
    mockDiscordService.getUserInfo.mockImplementation((id: string) =>
      id === NEO
        ? Promise.resolve({
            userId: NEO,
            username: "neo.baka",
            displayName: "Neo the Baka",
          })
        : Promise.reject(new NotFoundException("Discord user not found")),
    );
  });

  it("asks only about unclaimed Discord owners, once per account", async () => {
    await service.run();

    const { where, distinct } =
      mockDatabaseService.pendingOwnership.findMany.mock.calls[0][0];
    expect(where).toEqual({
      provider: ExternalAccountProvider.DISCORD,
      claimedAt: null,
    });
    expect(distinct).toEqual(["providerAccountId"]);
    expect(mockDiscordService.getUserInfo).toHaveBeenCalledTimes(2);
  });

  it("records both names on every row the account holds", async () => {
    await service.run();

    expect(
      mockDatabaseService.pendingOwnership.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        provider: ExternalAccountProvider.DISCORD,
        providerAccountId: NEO,
        claimedAt: null,
      },
      data: { displayIdentifier: "neo.baka", displayName: "Neo the Baka" },
    });
  });

  it("counts an account Discord no longer knows as failed, and carries on", async () => {
    const status = await service.run();

    expect(status).toMatchObject({
      running: false,
      total: 2,
      processed: 2,
      updated: 1,
      failed: 1,
    });
    // Nothing written for it: a stale name beats no name at all.
    expect(
      mockDatabaseService.pendingOwnership.updateMany,
    ).toHaveBeenCalledTimes(1);
  });

  it("refuses a second run while one is going", async () => {
    // Every lookup waits on one gate, held shut until the second call is seen.
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mockDiscordService.getUserInfo.mockImplementation(async () => {
      await gate;
      return { userId: NEO, username: "neo.baka", displayName: null };
    });

    const first = service.run();
    await expect(service.run()).rejects.toThrow("already running");
    release();
    await first;
  });

  it("reports progress while it runs", async () => {
    expect(service.status()).toMatchObject({ running: false, total: 0 });
    await service.run();
    expect(service.status()).toMatchObject({ running: false, processed: 2 });
    expect(service.status().finishedAt).toBeInstanceOf(Date);
  });
});
