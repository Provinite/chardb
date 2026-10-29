import { Test, TestingModule } from "@nestjs/testing";
import { ExternalAccountProvider } from "@chardb/database";
import { PendingOwnershipService } from "./pending-ownership.service";
import { DatabaseService } from "../database/database.service";
import { ExternalAccountsService } from "../external-accounts/external-accounts.service";
import { ItemTransactionsService } from "../item-transactions/item-transactions.service";
import { mockDatabaseService } from "../../test/setup";

const NEO = "214000000000009071";
const ART = "a-deviantart-uuid";
const NEO_NEWEST = new Date("2025-11-22T19:00:00Z");
const ART_NEWEST = new Date("2025-11-18T19:00:00Z");

/**
 * External members: the people something waits on in a community without an
 * account here, one row per external account, for staff to look up (#445).
 */
describe("PendingOwnershipService.findExternalMembers", () => {
  let service: PendingOwnershipService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PendingOwnershipService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: ExternalAccountsService, useValue: {} },
        { provide: ItemTransactionsService, useValue: {} },
      ],
    }).compile();
    service = module.get(PendingOwnershipService);

    // Two groupings: the page of accounts, then the counts for that page.
    mockDatabaseService.pendingOwnership.groupBy.mockImplementation(
      (args: { _count?: unknown }) =>
        Promise.resolve(
          args._count
            ? [
                {
                  provider: "DISCORD",
                  providerAccountId: NEO,
                  _count: { itemId: 2, characterId: 0 },
                  _max: { createdAt: NEO_NEWEST },
                },
                {
                  provider: "DEVIANTART",
                  providerAccountId: ART,
                  _count: { itemId: 0, characterId: 1 },
                  _max: { createdAt: ART_NEWEST },
                },
              ]
            : [
                { provider: "DISCORD", providerAccountId: NEO },
                { provider: "DEVIANTART", providerAccountId: ART },
              ],
        ),
    );
    // Only each account's newest rows: two for Neo, granted in one batch.
    mockDatabaseService.pendingOwnership.findMany.mockResolvedValue([
      {
        id: "po3",
        provider: "DISCORD",
        providerAccountId: NEO,
        displayIdentifier: "neo.baka",
        displayName: "Neo the Baka",
      },
      {
        id: "po2",
        provider: "DEVIANTART",
        providerAccountId: ART,
        displayIdentifier: "someartist",
        displayName: null,
      },
      {
        id: "po4",
        provider: "DISCORD",
        providerAccountId: NEO,
        displayIdentifier: "neo.baka",
        displayName: "Neo the Baka",
      },
    ]);
  });

  const countsCall = () =>
    mockDatabaseService.pendingOwnership.groupBy.mock.calls.find(
      ([args]: [{ _count?: unknown }]) => args._count,
    )?.[0];

  const groupWhere = () =>
    mockDatabaseService.pendingOwnership.groupBy.mock.calls[0][0].where;

  it("lists one row per external account, with what waits on each", async () => {
    const result = await service.findExternalMembers("comm1", {});

    expect(
      result.members.map((m) => [m.holder.id, m.itemCount, m.characterCount]),
    ).toEqual([
      ["po3", 2, 0],
      ["po2", 0, 1],
    ]);
  });

  it("counts only what still waits on them in this community", async () => {
    await service.findExternalMembers("comm1", {});

    expect(groupWhere()).toEqual({
      AND: [
        { claimedAt: null },
        {
          OR: [
            {
              item: {
                destroyedAt: null,
                ownerId: null,
                itemType: { communityId: "comm1" },
              },
            },
            {
              character: {
                deletedAt: null,
                species: { communityId: "comm1" },
              },
            },
          ],
        },
      ],
    });
  });

  it("narrows to a provider and a search, by either name or the exact id", async () => {
    await service.findExternalMembers("comm1", {
      provider: ExternalAccountProvider.DISCORD,
      search: "neo",
    });

    expect(groupWhere().AND).toEqual(
      expect.arrayContaining([
        { provider: ExternalAccountProvider.DISCORD },
        {
          OR: [
            { displayIdentifier: { contains: "neo", mode: "insensitive" } },
            { displayName: { contains: "neo", mode: "insensitive" } },
            { providerAccountId: "neo" },
          ],
        },
      ]),
    );
  });

  it("counts everything waiting on someone a search finds, not only the matching rows", async () => {
    // Older rows predate name lookups: a search by name matches the newer
    // ones, but the person holds all of them.
    await service.findExternalMembers("comm1", { search: "neo" });

    expect(JSON.stringify(countsCall()?.where)).not.toContain("neo");
  });

  it("counts in the database, loading only each person's newest rows (#445)", async () => {
    // Someone holding thousands would otherwise load thousands of rows on
    // every page view, just to print a number.
    await service.findExternalMembers("comm1", {});

    expect(countsCall()).toMatchObject({
      by: ["provider", "providerAccountId"],
      _count: { itemId: true, characterId: true },
      _max: { createdAt: true },
    });
    const { where } =
      mockDatabaseService.pendingOwnership.findMany.mock.calls[0][0];
    expect(JSON.stringify(where)).toContain(NEO_NEWEST.toISOString());
    expect(JSON.stringify(where)).toContain(ART_NEWEST.toISOString());
  });

  it("pages by one row past the page, newest first", async () => {
    const result = await service.findExternalMembers("comm1", {
      limit: 1,
      offset: 25,
    });

    const call = mockDatabaseService.pendingOwnership.groupBy.mock.calls[0][0];
    expect(call.skip).toBe(25);
    expect(call.take).toBe(2);
    expect(call.orderBy).toEqual([
      { _max: { createdAt: "desc" } },
      { providerAccountId: "asc" },
    ]);
    expect(result.members).toHaveLength(1);
    expect(result.hasMore).toBe(true);
  });

  it("asks nothing more when nobody matches", async () => {
    mockDatabaseService.pendingOwnership.groupBy.mockResolvedValue([]);

    const result = await service.findExternalMembers("comm1", {
      search: "nobody",
    });

    expect(result).toEqual({ members: [], hasMore: false });
    expect(
      mockDatabaseService.pendingOwnership.findMany,
    ).not.toHaveBeenCalled();
  });
});
