import { Test, TestingModule } from "@nestjs/testing";
import { CommunitiesService } from "./communities.service";
import { DatabaseService } from "../database/database.service";
import { mockDatabaseService } from "../../test/setup";

describe("CommunitiesService", () => {
  let service: CommunitiesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunitiesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<CommunitiesService>(CommunitiesService);
  });

  describe("countMembers", () => {
    it("counts memberships through the community's roles", async () => {
      mockDatabaseService.communityMember.count.mockResolvedValue(7);

      const count = await service.countMembers("comm1");

      expect(count).toBe(7);
      // Community has no direct membership relation -- a membership belongs to
      // a Role, and the Role belongs to the community. Counting any other way
      // (e.g. off Role) would double-count members holding several roles.
      expect(mockDatabaseService.communityMember.count).toHaveBeenCalledWith({
        where: { role: { communityId: "comm1" } },
      });
    });

    it("returns zero for a community with no members", async () => {
      mockDatabaseService.communityMember.count.mockResolvedValue(0);

      await expect(service.countMembers("empty")).resolves.toBe(0);
    });
  });
});
