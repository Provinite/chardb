import { Test, TestingModule } from "@nestjs/testing";
import { ExternalAccountProvider } from "@chardb/database";
import { PendingOwnershipService } from "./pending-ownership.service";
import { DatabaseService } from "../database/database.service";
import { ExternalAccountsService } from "../external-accounts/external-accounts.service";
import { ItemTransactionsService } from "../item-transactions/item-transactions.service";
import { mockDatabaseService } from "../../test/setup";

const NEO = "214000000000009071";
const ART = "a-deviantart-uuid";

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

    mockDatabaseService.pendingOwnership.groupBy.mockResolvedValue([
      { provider: "DISCORD", providerAccountId: NEO },
      { provider: "DEVIANTART", providerAccountId: ART },
    ]);
    mockDatabaseService.pendingOwnership.findMany.mockResolvedValue([
      // Newest first, as asked for: the first row of each is its holder.
      {
        id: "po3",
        provider: "DISCORD",
        providerAccountId: NEO,
        displayIdentifier: "neo.baka",
        displayName: "Neo the Baka",
        itemId: "i2",
        characterId: null,
      },
      {
        id: "po2",
        provider: "DEVIANTART",
        providerAccountId: ART,
        displayIdentifier: "someartist",
        displayName: null,
        itemId: null,
        characterId: "c1",
      },
      {
        id: "po1",
        provider: "DISCORD",
        providerAccountId: NEO,
        displayIdentifier: "neo.baka",
        displayName: "Neo the Baka",
        itemId: "i1",
        characterId: null,
      },
    ]);
  });

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

  it("pages by one row past the page, newest first", async () => {
    mockDatabaseService.pendingOwnership.groupBy.mockResolvedValue([
      { provider: "DISCORD", providerAccountId: NEO },
      { provider: "DEVIANTART", providerAccountId: ART },
    ]);

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
