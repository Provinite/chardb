import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { CommunityMembersModule } from "./community-members.module";

const IS_MEMBER_OF = `
  query IsMemberOf($username: String!, $communityId: ID!) {
    user(username: $username) {
      isMemberOf(communityId: $communityId)
    }
  }
`;

/**
 * Whether a person belongs to one community, so a community host can tell a
 * member's profile from a stranger's. Visible to anyone signed in, like the
 * members list it summarises.
 */
describe("User.isMemberOf (e2e)", () => {
  let testApp: TestApp;
  let viewerToken: string;
  let communityId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [
        DatabaseModule,
        AuthModule,
        UsersModule,
        CommunityMembersModule,
      ],
    });
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    const member = await testApp.createTestUser({
      email: "member@test.dev",
      username: "member",
    });
    await testApp.createTestUser({
      email: "stranger@test.dev",
      username: "stranger",
    });
    const viewer = await testApp.createTestUser({
      email: "viewer@test.dev",
      username: "viewer",
    });
    viewerToken = await testApp.generateTestToken(viewer.id);
    communityId = (await testApp.createTestCommunitySetup(member.id))
      .communityId;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  it.each([
    ["member", true],
    ["stranger", false],
  ])("says whether %s belongs", async (username, expected) => {
    const response = await testApp.authenticatedGraphqlRequest(
      IS_MEMBER_OF,
      { username, communityId },
      viewerToken,
    );

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.user.isMemberOf).toBe(expected);
  });

  it("does not answer a signed-out visitor", async () => {
    const response = await testApp.graphqlRequest(IS_MEMBER_OF, {
      username: "member",
      communityId,
    });

    expect(response.body.errors).toBeDefined();
  });
});
