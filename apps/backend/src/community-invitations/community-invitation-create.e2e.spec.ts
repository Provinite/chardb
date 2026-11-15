import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { CommunityInvitationsModule } from "./community-invitations.module";

const INVITE = `
  mutation Invite($roleId: ID!, $inviteeId: ID!, $communityId: ID!) {
    createCommunityInvitation(
      createCommunityInvitationInput: {
        roleId: $roleId
        inviteeId: $inviteeId
        communityId: $communityId
      }
    ) {
      id
    }
  }
`;

/**
 * Inviting someone into a community, with one of its own roles.
 *
 * Accepting an invitation joins whatever community its role belongs to. So a
 * role from somewhere else would let staff of one community invite anyone
 * into another, past every gate on joining it.
 */
describe("creating a community invitation (e2e)", () => {
  let testApp: TestApp;
  let here: string;
  let staffId: string;
  let inviteeId: string;
  let staffSession: string;
  const roles = {} as Record<"here" | "elsewhere", string>;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [
        DatabaseModule,
        AuthModule,
        UsersModule,
        CommunityInvitationsModule,
      ],
    });
    await testApp.clearDatabase();

    here = (await testApp.createTestCommunity("Here")).id;
    const elsewhere = (await testApp.createTestCommunity("Elsewhere")).id;
    roles.here = (await testApp.createTestRole(here)).id;
    roles.elsewhere = (
      await testApp.createTestRole(elsewhere, { canEditRole: true })
    ).id;
    const staffRole = await testApp.createTestRole(here, {
      canCreateInviteCode: true,
    });

    const staff = await testApp.createTestUser({
      username: "invite_staff",
      email: "invite_staff@example.com",
    });
    await testApp.createTestCommunityMember(staff.id, staffRole.id);
    staffId = staff.id;
    staffSession = await testApp.generateTestToken(staff.id, staff.username);
    inviteeId = (
      await testApp.createTestUser({
        username: "invite_invitee",
        email: "invite_invitee@example.com",
      })
    ).id;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  const invite = (roleId: string) =>
    testApp.authenticatedGraphqlRequest(
      INVITE,
      { roleId, inviteeId, communityId: here },
      staffSession,
    );

  it("invites with one of the community's roles, from the caller", async () => {
    const response = await invite(roles.here);

    expect(response.body.errors).toBeUndefined();
    const stored = await testApp.getDb().communityInvitation.findUniqueOrThrow({
      where: { id: response.body.data.createCommunityInvitation.id },
    });
    expect(stored.inviterId).toBe(staffId);
  });

  it("refuses a role from another community", async () => {
    const response = await invite(roles.elsewhere);

    expect(response.body.errors?.[0]?.message).toBe(
      "That role belongs to another community",
    );
    expect(
      await testApp
        .getDb()
        .communityInvitation.count({ where: { roleId: roles.elsewhere } }),
    ).toBe(0);
  });

  it("names no inviter but the caller", async () => {
    const response = await testApp.authenticatedGraphqlRequest(
      `mutation {
        createCommunityInvitation(createCommunityInvitationInput: {
          roleId: "${roles.here}"
          inviteeId: "${inviteeId}"
          communityId: "${here}"
          inviterId: "${inviteeId}"
        }) { id }
      }`,
      {},
      staffSession,
    );

    // The field no longer exists, so naming someone else cannot even parse.
    expect(response.body.errors?.[0]?.extensions?.code).toBe(
      "GRAPHQL_VALIDATION_FAILED",
    );
  });
});
