import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { RolesModule } from "../roles/roles.module";
import { CommunityMembersModule } from "./community-members.module";

const MEMBERS = `
  query communityMembersByCommunity(
    $communityId: ID!
    $first: Int
    $after: String
    $search: String
  ) {
    communityMembersByCommunity(
      communityId: $communityId
      first: $first
      after: $after
      search: $search
    ) {
      totalCount
      hasNextPage
      nodes {
        id
        user {
          username
        }
      }
    }
  }
`;

interface MembersPage {
  totalCount: number;
  hasNextPage: boolean;
  nodes: { id: string; user: { username: string } }[];
}

/**
 * Member search on the members page runs on the server, so a member past the
 * first page can still be found (#566).
 */
describe("communityMembersByCommunity search (e2e)", () => {
  let testApp: TestApp;
  let communityId: string;
  let token: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [
        DatabaseModule,
        AuthModule,
        UsersModule,
        RolesModule,
        CommunityMembersModule,
      ],
    });
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  /**
   * Joined one minute apart in list order, so the newest-first order is
   * `members` reversed.
   */
  const join = async (
    members: { username: string; displayName?: string; role: string }[],
  ) => {
    const db = testApp.getDb();
    const start = new Date("2026-01-01T00:00:00Z").getTime();
    for (const [i, m] of members.entries()) {
      const user = await testApp.createTestUser({
        username: m.username,
        email: `${m.username}@example.com`,
        displayName: m.displayName ?? null,
      });
      await db.communityMember.create({
        data: {
          userId: user.id,
          roleId: roles[m.role],
          createdAt: new Date(start + i * 60_000),
        },
      });
    }
  };

  let roles: Record<string, string>;

  beforeEach(async () => {
    await testApp.clearDatabase();
    const db = testApp.getDb();
    communityId = (await testApp.createTestCommunity("Willowmere")).id;
    roles = {};
    for (const name of ["Member", "Moderator"]) {
      roles[name] = (await db.role.create({ data: { name, communityId } })).id;
    }

    const viewer = await testApp.createTestUser({
      username: "viewer",
      email: "viewer@example.com",
    });
    await db.communityMember.create({
      data: {
        userId: viewer.id,
        roleId: roles.Member,
        createdAt: new Date("2025-01-01T00:00:00Z"),
      },
    });
    token = await testApp.generateTestToken(viewer.id, "viewer");

    // Someone in another community with a matching name, who never appears.
    const elsewhere = (await testApp.createTestCommunity("Elsewhere")).id;
    const outsider = await testApp.createTestUser({
      username: "fernoutsider",
      email: "fernoutsider@example.com",
    });
    const outsiderRole = await db.role.create({
      data: { name: "Member", communityId: elsewhere },
    });
    await db.communityMember.create({
      data: { userId: outsider.id, roleId: outsiderRole.id },
    });
  });

  const fetchMembers = async (variables: {
    search?: string;
    first?: number;
    after?: string;
  }): Promise<MembersPage> => {
    const res = await testApp.authenticatedGraphqlRequest(
      MEMBERS,
      { communityId, ...variables },
      token,
    );
    expect(res.body.errors).toBeUndefined();
    return res.body.data.communityMembersByCommunity;
  };

  const usernames = (page: MembersPage) =>
    page.nodes.map((n) => n.user.username);

  it("finds a member past the first page", async () => {
    await join([
      { username: "fern", role: "Member" },
      ...Array.from({ length: 5 }, (_, i) => ({
        username: `filler${i}`,
        role: "Member",
      })),
    ]);

    const page = await fetchMembers({ search: "fern", first: 2 });

    expect(usernames(page)).toEqual(["fern"]);
    expect(page.totalCount).toBe(1);
    expect(page.hasNextPage).toBe(false);
  });

  it("matches username, display name and role name, ignoring case", async () => {
    await join([
      { username: "ashgrove", role: "Member" },
      { username: "quill", displayName: "Lady Ashford", role: "Member" },
      { username: "bramble", role: "Moderator" },
      { username: "nobody", role: "Member" },
    ]);

    expect(usernames(await fetchMembers({ search: "ASH" }))).toEqual([
      "quill",
      "ashgrove",
    ]);
    expect(usernames(await fetchMembers({ search: "moder" }))).toEqual([
      "bramble",
    ]);
  });

  it("ranks exact username and display name matches first", async () => {
    await join([
      { username: "rowan", role: "Member" },
      { username: "rowanberry", role: "Member" },
      { username: "elder", displayName: "Rowan", role: "Member" },
      { username: "rowan_ii", role: "Member" },
    ]);

    const page = await fetchMembers({ search: "rowan" });

    // Exact matches newest first, then the rest newest first.
    expect(usernames(page)).toEqual([
      "elder",
      "rowan",
      "rowan_ii",
      "rowanberry",
    ]);
    expect(page.totalCount).toBe(4);
  });

  it("ranks an exact username match first under any casing", async () => {
    await join([
      { username: "rowan_ii", role: "Member" },
      { username: "rowan_iii", role: "Member" },
    ]);

    // `_` matches only itself, in the exact match and the partial one.
    expect(usernames(await fetchMembers({ search: "ROWAN_II" }))).toEqual([
      "rowan_ii",
      "rowan_iii",
    ]);
    expect(usernames(await fetchMembers({ search: "Rowan_I" }))).toEqual([
      "rowan_iii",
      "rowan_ii",
    ]);
  });

  it("pages through exact and partial matches with a cursor", async () => {
    await join([
      { username: "rowan", role: "Member" },
      { username: "rowanberry", role: "Member" },
      { username: "elder", displayName: "Rowan", role: "Member" },
      { username: "rowan_ii", role: "Member" },
    ]);

    const seen: string[] = [];
    let after: string | undefined;
    let hasNextPage = true;
    while (hasNextPage) {
      const page = await fetchMembers({ search: "rowan", first: 1, after });
      seen.push(...usernames(page));
      expect(page.totalCount).toBe(4);
      hasNextPage = page.hasNextPage;
      after = page.nodes.at(-1)?.id;
    }

    expect(seen).toEqual(["elder", "rowan", "rowan_ii", "rowanberry"]);
  });

  it("lists everyone newest first without a search", async () => {
    await join([
      { username: "first", role: "Member" },
      { username: "second", role: "Moderator" },
    ]);

    const page = await fetchMembers({});

    expect(usernames(page)).toEqual(["second", "first", "viewer"]);
    expect(page.totalCount).toBe(3);
  });

  it("treats _ and % in a search as literal characters", async () => {
    await join([
      { username: "rowan_ii", role: "Member" },
      { username: "rowanberry", role: "Member" },
      { username: "rowanx", role: "Member" },
    ]);

    expect(usernames(await fetchMembers({ search: "rowan_" }))).toEqual([
      "rowan_ii",
    ]);
    expect(usernames(await fetchMembers({ search: "%" }))).toEqual([]);
  });

  it("pages members who joined at the same moment without repeats", async () => {
    const db = testApp.getDb();
    const sameMoment = new Date("2026-02-01T00:00:00Z");
    for (let i = 0; i < 6; i++) {
      const user = await testApp.createTestUser({
        username: `batch${i}`,
        email: `batch${i}@example.com`,
      });
      await db.communityMember.create({
        data: { userId: user.id, roleId: roles.Member, createdAt: sameMoment },
      });
    }

    const seen: string[] = [];
    let after: string | undefined;
    let hasNextPage = true;
    while (hasNextPage) {
      const page = await fetchMembers({ first: 2, after });
      seen.push(...usernames(page));
      hasNextPage = page.hasNextPage;
      after = page.nodes.at(-1)?.id;
    }

    expect([...seen].sort()).toEqual([
      "batch0",
      "batch1",
      "batch2",
      "batch3",
      "batch4",
      "batch5",
      "viewer",
    ]);
  });
});
