import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { InviteCodesModule } from "./invite-codes.module";

/**
 * Who claims an invite code, and who made it, is the caller. Neither is taken
 * from the request: a code joins the person using it, and nobody else, to
 * its community.
 */
describe("invite codes act for the caller (e2e)", () => {
  let testApp: TestApp;
  let roleId: string;
  const users = {} as Record<"claimer" | "bystander" | "creator", string>;
  const sessions = {} as Record<"claimer" | "creator", string>;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, UsersModule, InviteCodesModule],
    });
    await testApp.clearDatabase();

    const community = await testApp.createTestCommunity("Codeville");
    roleId = (await testApp.createTestRole(community.id)).id;

    for (const [name, account] of [
      ["claimer", {}],
      ["bystander", {}],
      ["creator", { canCreateInviteCode: true }],
    ] as const) {
      const user = await testApp.createTestUser({
        username: `code_${name}`,
        email: `code_${name}@example.com`,
        ...account,
      });
      users[name] = user.id;
      if (name !== "bystander") {
        sessions[name] = await testApp.generateTestToken(
          user.id,
          user.username,
        );
      }
    }
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  const makeCode = async (id: string) =>
    testApp.getDb().inviteCode.create({
      data: { id, maxClaims: 10, creatorId: users.creator, roleId },
    });

  const isMember = async (userId: string) =>
    (await testApp
      .getDb()
      .communityMember.count({ where: { userId, roleId } })) > 0;

  it("joins the caller who claims a code", async () => {
    await makeCode("code-for-me");

    const response = await testApp.authenticatedGraphqlRequest(
      `mutation { claimInviteCode(id: "code-for-me") { id } }`,
      {},
      sessions.claimer,
    );

    expect(response.body.errors).toBeUndefined();
    expect(await isMember(users.claimer)).toBe(true);
  });

  it("cannot claim a code on someone else's behalf", async () => {
    await makeCode("code-for-them");

    const response = await testApp.authenticatedGraphqlRequest(
      `mutation {
        claimInviteCode(
          id: "code-for-them"
          claimInviteCodeInput: { userId: "${users.bystander}" }
        ) { id }
      }`,
      {},
      sessions.claimer,
    );

    expect(response.body.errors?.[0]?.extensions?.code).toBe(
      "GRAPHQL_VALIDATION_FAILED",
    );
    expect(await isMember(users.bystander)).toBe(false);
  });

  it("records the caller as a new code's creator", async () => {
    const response = await testApp.authenticatedGraphqlRequest(
      `mutation {
        createInviteCode(createInviteCodeInput: { id: "made-by-me", maxClaims: 1 }) {
          id
        }
      }`,
      {},
      sessions.creator,
    );

    expect(response.body.errors).toBeUndefined();
    const stored = await testApp
      .getDb()
      .inviteCode.findUniqueOrThrow({ where: { id: "made-by-me" } });
    expect(stored.creatorId).toBe(users.creator);
  });

  it("cannot name someone else as a code's creator", async () => {
    const response = await testApp.authenticatedGraphqlRequest(
      `mutation {
        createInviteCode(createInviteCodeInput: {
          id: "made-by-them"
          maxClaims: 1
          creatorId: "${users.bystander}"
        }) { id }
      }`,
      {},
      sessions.creator,
    );

    expect(response.body.errors?.[0]?.extensions?.code).toBe(
      "GRAPHQL_VALIDATION_FAILED",
    );
  });
});
