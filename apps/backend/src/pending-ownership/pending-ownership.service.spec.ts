import { Test, TestingModule } from "@nestjs/testing";
import { ExternalAccountProvider, type Prisma } from "@chardb/database";
import { PendingOwnershipService } from "./pending-ownership.service";
import { DatabaseService } from "../database/database.service";
import { ExternalAccountsService } from "../external-accounts/external-accounts.service";
import { ItemTransactionsService } from "../item-transactions/item-transactions.service";
import { mockDatabaseService } from "../../test/setup";

const NEO = "214000000000009071";
const ART = "a-deviantart-uuid";

/** A row of the holders-and-counts query, as Postgres returns it. */
const holderRow = (overrides: Record<string, unknown>) => ({
  id: "po",
  item_id: null,
  character_id: null,
  provider: "DISCORD",
  provider_account_id: NEO,
  display_identifier: null,
  display_name: null,
  created_at: new Date("2025-11-22T19:00:00Z"),
  claimed_at: null,
  claimed_by_user_id: null,
  // count() comes back as a bigint.
  item_count: BigInt(0),
  character_count: BigInt(0),
  ...overrides,
});

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
    mockDatabaseService.$queryRaw.mockResolvedValue([
      holderRow({
        id: "po3",
        display_identifier: "neo.baka",
        display_name: "Neo the Baka",
        item_id: "i2",
        item_count: BigInt(2),
      }),
      holderRow({
        id: "po2",
        provider: "DEVIANTART",
        provider_account_id: ART,
        display_identifier: "someartist",
        character_id: "c1",
        character_count: BigInt(1),
      }),
    ]);
  });

  const groupWhere = () =>
    mockDatabaseService.pendingOwnership.groupBy.mock.calls[0][0].where;
  /** The one holders-and-counts query, as handed to $queryRaw. */
  const rawQuery = () =>
    mockDatabaseService.$queryRaw.mock.calls[0][0] as Prisma.Sql;

  it("lists one row per external account, with what waits on each", async () => {
    const result = await service.findExternalMembers("comm1", {});

    expect(
      result.members.map((m) => [
        m.holder.id,
        m.holder.displayIdentifier,
        m.itemCount,
        m.characterCount,
      ]),
    ).toEqual([
      ["po3", "neo.baka", 2, 0],
      ["po2", "someartist", 0, 1],
    ]);
  });

  it("keeps the page's order, whatever order the holders come back in", async () => {
    mockDatabaseService.$queryRaw.mockResolvedValue(
      [...(await mockDatabaseService.$queryRaw())].reverse(),
    );

    const result = await service.findExternalMembers("comm1", {});

    expect(result.members.map((m) => m.holder.id)).toEqual(["po3", "po2"]);
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
    // The same rule in the holders-and-counts query.
    const { sql, values } = rawQuery();
    expect(sql).toMatch(/claimed_at IS NULL/);
    expect(sql).toMatch(/destroyed_at IS NULL/);
    expect(sql).toMatch(/owner_id IS NULL/);
    expect(sql).toMatch(/deleted_at IS NULL/);
    expect(values).toContain("comm1");
  });

  it("narrows the page to a provider and a search, by either name or the exact id", async () => {
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

  it("finds holders and counts with no regard to the search", async () => {
    // A search decides who is listed. Who they are and what they hold come
    // from every row waiting on them: older rows predate name lookups, and
    // matching only the searched-for rows would undercount them and could
    // name them by a stale row.
    await service.findExternalMembers("comm1", { search: "neo" });

    const { sql, values } = rawQuery();
    expect(values).not.toContain("neo");
    expect(values.join(" ")).not.toMatch(/neo(?!\d)/);
    expect(sql).not.toMatch(/ILIKE|display_name\s*=|display_identifier\s*=/i);
  });

  it("asks one query, keyed to the page's accounts, for holders and counts", async () => {
    // Bounded by the page, not by how much anyone holds (#445).
    await service.findExternalMembers("comm1", {});

    expect(mockDatabaseService.$queryRaw).toHaveBeenCalledTimes(1);
    expect(
      mockDatabaseService.pendingOwnership.findMany,
    ).not.toHaveBeenCalled();
    const { sql, values } = rawQuery();
    expect(sql).toMatch(/DISTINCT ON/);
    // Newest row wins; id settles a tie, so the name shown never wobbles.
    expect(sql).toMatch(/ORDER BY[\s\S]*created_at DESC[\s\S]*id DESC/);
    expect(values).toEqual(
      expect.arrayContaining([
        ["DISCORD", "DEVIANTART"],
        [NEO, ART],
      ]),
    );
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
    expect(mockDatabaseService.$queryRaw).not.toHaveBeenCalled();
  });
});
