import { Test, TestingModule } from "@nestjs/testing";
import { CommunitiesService } from "./communities.service";
import { DatabaseService } from "../database/database.service";
import { mockDatabaseService } from "../../test/setup";

/**
 * Member search ordering.
 *
 * The interesting claim is not which rows come back but in what order, and the
 * limit is applied in SQL -- so an exact match that loses the database's cut
 * cannot be rescued by sorting afterwards. That is why this is two queries,
 * and asserting the two is the only way to say so.
 */
describe("CommunitiesService.getMembers", () => {
  let service: CommunitiesService;
  const findMany = mockDatabaseService.user.findMany as jest.Mock;

  const user = (username: string) => ({
    id: `id-${username}`,
    username,
    displayName: username,
    avatarImageId: null,
  });

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

  it("asks for exact names before substrings, and returns them first", async () => {
    // `amember` sorts before `member` and contains it, so alphabetical order
    // alone would bury the person actually named.
    findMany
      .mockResolvedValueOnce([user("member")])
      .mockResolvedValueOnce([user("amember"), user("othermember")]);

    const result = await service.getMembers("community-1", {
      search: "member",
      limit: 3,
    });

    expect(result.map((u) => u.username)).toEqual([
      "member",
      "amember",
      "othermember",
    ]);

    const [exactCall, partialCall] = findMany.mock.calls;
    expect(exactCall[0].where.OR).toEqual([
      { username: { equals: "member", mode: "insensitive" } },
      { displayName: { equals: "member", mode: "insensitive" } },
    ]);
    expect(partialCall[0].where.OR).toEqual([
      { username: { contains: "member", mode: "insensitive" } },
      { displayName: { contains: "member", mode: "insensitive" } },
    ]);
  });

  it("does not re-list an exact match among the substrings", async () => {
    findMany
      .mockResolvedValueOnce([user("member")])
      .mockResolvedValueOnce([user("othermember")]);

    await service.getMembers("community-1", { search: "member", limit: 5 });

    const [, partialCall] = findMany.mock.calls;
    expect(partialCall[0].where.id).toEqual({ notIn: ["id-member"] });
    // Four left of a limit of five, the one exact match having taken the first.
    expect(partialCall[0].take).toBe(4);
  });

  it("asks once when the exact matches already fill the page", async () => {
    findMany.mockResolvedValueOnce([user("member"), user("Member")]);

    const result = await service.getMembers("community-1", {
      search: "member",
      limit: 2,
    });

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
  });

  it("asks once, alphabetically, when nothing was typed", async () => {
    findMany.mockResolvedValueOnce([user("amember")]);

    await service.getMembers("community-1", { limit: 5 });

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].where.OR).toBeUndefined();
    expect(findMany.mock.calls[0][0].orderBy).toEqual({ username: "asc" });
  });

  it("caps the page at twenty however many were asked for", async () => {
    findMany.mockResolvedValueOnce([]);

    await service.getMembers("community-1", { limit: 500 });

    expect(findMany.mock.calls[0][0].take).toBe(20);
  });
});
