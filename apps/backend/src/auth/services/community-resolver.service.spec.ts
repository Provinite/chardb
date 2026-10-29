import { mockDatabaseService } from "../../../test/setup";
import { DatabaseService } from "../../database/database.service";
import { CommunityResolverService } from "./community-resolver.service";

/**
 * Field resolvers guarded by a community permission resolve their community
 * once per field. A ledger page of unclaimed items guards three fields on
 * every row's pending owner (#445), so within one request those lookups are
 * batched rather than run per field per row.
 */
describe("CommunityResolverService", () => {
  let service: CommunityResolverService;
  const community = { id: "comm1", name: "Cloverse" };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommunityResolverService(
      mockDatabaseService as unknown as DatabaseService,
    );
    mockDatabaseService.pendingOwnership.findMany.mockResolvedValue([
      {
        id: "po1",
        item: { itemType: { communityId: "comm1" } },
        character: null,
      },
      {
        id: "po2",
        item: null,
        character: { species: { communityId: "comm1" } },
      },
    ]);
    mockDatabaseService.community.findMany.mockResolvedValue([community]);
  });

  it("resolves many pending owners in one request with one query each for owners and communities", async () => {
    const req = {};
    const lookups = ["po1", "po2", "po1", "po2", "po1", "po2"].map((value) =>
      service.resolve({ type: "pendingOwnershipId", value }, req),
    );

    expect(await Promise.all(lookups)).toEqual(Array(6).fill(community));
    expect(mockDatabaseService.pendingOwnership.findMany).toHaveBeenCalledTimes(
      1,
    );
    expect(mockDatabaseService.community.findMany).toHaveBeenCalledTimes(1);
    expect(
      mockDatabaseService.pendingOwnership.findUnique,
    ).not.toHaveBeenCalled();
  });

  it("does not share what one request looked up with another", async () => {
    await service.resolve({ type: "pendingOwnershipId", value: "po1" }, {});
    await service.resolve({ type: "pendingOwnershipId", value: "po1" }, {});

    expect(mockDatabaseService.pendingOwnership.findMany).toHaveBeenCalledTimes(
      2,
    );
  });

  it("still refuses a pending owner that does not exist", async () => {
    await expect(
      service.resolve({ type: "pendingOwnershipId", value: "gone" }, {}),
    ).rejects.toThrow("PendingOwnership with ID gone not found");
  });
});
