import { TestApp, AUTH_QUERIES } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { CommunitiesModule } from "./communities.module";
import { RolesModule } from "../roles/roles.module";
import { CommunityMembersModule } from "../community-members/community-members.module";

const SET_OPEN_SIGNUP = `
  mutation setCommunityOpenSignup($communityId: ID!, $roleId: ID) {
    setCommunityOpenSignup(communityId: $communityId, roleId: $roleId) {
      id
      openSignupRoleId
    }
  }
`;

const JOIN_COMMUNITY = `
  mutation joinCommunity($communityId: ID!) {
    joinCommunity(communityId: $communityId) {
      id
      role {
        id
      }
    }
  }
`;

const DELETE_ROLE = `
  mutation removeRole($id: ID!) {
    removeRole(id: $id) {
      removed
    }
  }
`;

/**
 * A community can let anyone join without an invite code, with a role it
 * picks: new visitors as part of signing up, existing accounts with one
 * mutation.
 */
describe("Community open sign-up (e2e)", () => {
  let testApp: TestApp;
  let communityId: string;
  let memberRoleId: string;
  let otherRoleId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [
        DatabaseModule,
        AuthModule,
        UsersModule,
        CommunitiesModule,
        RolesModule,
        CommunityMembersModule,
      ],
    });
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    const db = testApp.getDb();
    communityId = (await testApp.createTestCommunity("Willowmere")).id;
    memberRoleId = (
      await db.role.create({ data: { name: "Member", communityId } })
    ).id;
    const otherCommunityId = (await testApp.createTestCommunity("Elsewhere"))
      .id;
    otherRoleId = (
      await db.role.create({
        data: { name: "Member", communityId: otherCommunityId },
      })
    ).id;
  });

  const openSignup = (roleId: string | null) =>
    testApp
      .getDb()
      .community.update({
        where: { id: communityId },
        data: { openSignupRoleId: roleId },
      });

  /** A member of the community whose role carries `permissions`. */
  const staffToken = async (permissions: Record<string, boolean>) => {
    const db = testApp.getDb();
    const user = await testApp.createTestUser({
      username: "staff",
      email: "staff@example.com",
    });
    const role = await db.role.create({
      data: { name: "Staff", communityId, ...permissions },
    });
    await testApp.createTestCommunityMember(user.id, role.id);
    return testApp.generateTestToken(user.id, user.username);
  };

  const signupInput = (extra: Record<string, unknown>) => ({
    username: "newcomer",
    email: "newcomer@example.com",
    password: "password123",
    ...extra,
  });

  describe("signup", () => {
    it("joins an open community without an invite code", async () => {
      await openSignup(memberRoleId);

      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input: signupInput({ communityId }),
      });

      expect(response.body.errors).toBeUndefined();
      const user = await testApp.getDb().user.findUniqueOrThrow({
        where: { email: "newcomer@example.com" },
        include: { communityMemberships: true },
      });
      expect(user.communityMemberships.map((m) => m.roleId)).toEqual([
        memberRoleId,
      ]);
    });

    it("refuses a community that requires an invite", async () => {
      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input: signupInput({ communityId }),
      });

      expect(response.body.errors?.[0].message).toBe(
        "This community requires an invite code",
      );
      const user = await testApp
        .getDb()
        .user.findUnique({ where: { email: "newcomer@example.com" } });
      expect(user).toBeNull();
    });

    it("refuses a signup with neither a code nor a community", async () => {
      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input: signupInput({}),
      });

      expect(response.body.errors?.[0].message).toBe(
        "An invite code is required",
      );
    });

    it("refuses a community that does not exist", async () => {
      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input: signupInput({
          communityId: "00000000-0000-0000-0000-000000000000",
        }),
      });

      expect(response.body.errors?.[0].message).toBe(
        "This community requires an invite code",
      );
    });

    it("uses the invite code when both are given", async () => {
      await openSignup(memberRoleId);
      const code = await testApp.createTestInviteCode();
      await testApp
        .getDb()
        .inviteCode.update({ where: { id: code }, data: { roleId: otherRoleId } });

      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input: signupInput({ communityId, inviteCode: code }),
      });

      expect(response.body.errors).toBeUndefined();
      const user = await testApp.getDb().user.findUniqueOrThrow({
        where: { email: "newcomer@example.com" },
        include: { communityMemberships: true },
      });
      expect(user.communityMemberships.map((m) => m.roleId)).toEqual([
        otherRoleId,
      ]);
    });
  });

  describe("joinCommunity", () => {
    const outsiderToken = async () => {
      const user = await testApp.createTestUser({
        username: "outsider",
        email: "outsider@example.com",
      });
      return {
        userId: user.id,
        token: await testApp.generateTestToken(user.id, user.username),
      };
    };

    it("joins an open community with its role", async () => {
      await openSignup(memberRoleId);
      const { userId, token } = await outsiderToken();

      const response = await testApp.authenticatedGraphqlRequest(
        JOIN_COMMUNITY,
        { communityId },
        token,
      );

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.joinCommunity.role.id).toBe(memberRoleId);
      const memberships = await testApp
        .getDb()
        .communityMember.findMany({ where: { userId } });
      expect(memberships.map((m) => m.roleId)).toEqual([memberRoleId]);
    });

    it("refuses a community that requires an invite", async () => {
      const { token } = await outsiderToken();

      const response = await testApp.authenticatedGraphqlRequest(
        JOIN_COMMUNITY,
        { communityId },
        token,
      );

      expect(response.body.errors?.[0].message).toBe(
        "This community requires an invite code",
      );
    });

    it("refuses someone who is already a member", async () => {
      await openSignup(memberRoleId);
      const { userId, token } = await outsiderToken();
      const db = testApp.getDb();
      const elder = await db.role.create({ data: { name: "Elder", communityId } });
      await testApp.createTestCommunityMember(userId, elder.id);

      const response = await testApp.authenticatedGraphqlRequest(
        JOIN_COMMUNITY,
        { communityId },
        token,
      );

      expect(response.body.errors?.[0].message).toBe(
        "You are already a member of this community",
      );
      expect(await db.communityMember.count({ where: { userId } })).toBe(1);
    });

    it("refuses an anonymous caller", async () => {
      await openSignup(memberRoleId);

      const response = await testApp.graphqlRequest(JOIN_COMMUNITY, {
        communityId,
      });

      expect(response.body.errors?.[0].extensions.code).not.toBe(
        "GRAPHQL_VALIDATION_FAILED",
      );
      expect(response.body.data).toBeNull();
    });
  });

  describe("setCommunityOpenSignup", () => {
    it("opens and closes sign-up for staff who can create invite codes", async () => {
      const token = await staffToken({ canCreateInviteCode: true });

      const opened = await testApp.authenticatedGraphqlRequest(
        SET_OPEN_SIGNUP,
        { communityId, roleId: memberRoleId },
        token,
      );
      expect(opened.body.errors).toBeUndefined();
      expect(opened.body.data.setCommunityOpenSignup.openSignupRoleId).toBe(
        memberRoleId,
      );

      const closed = await testApp.authenticatedGraphqlRequest(
        SET_OPEN_SIGNUP,
        { communityId, roleId: null },
        token,
      );
      expect(closed.body.errors).toBeUndefined();
      expect(
        closed.body.data.setCommunityOpenSignup.openSignupRoleId,
      ).toBeNull();
    });

    it("refuses staff who cannot create invite codes", async () => {
      const token = await staffToken({ canListInviteCodes: true });

      const response = await testApp.authenticatedGraphqlRequest(
        SET_OPEN_SIGNUP,
        { communityId, roleId: memberRoleId },
        token,
      );

      expect(response.body.errors?.[0].extensions.code).toBe("FORBIDDEN");
      const community = await testApp
        .getDb()
        .community.findUniqueOrThrow({ where: { id: communityId } });
      expect(community.openSignupRoleId).toBeNull();
    });

    it("refuses a role from another community", async () => {
      const token = await staffToken({ canCreateInviteCode: true });

      const response = await testApp.authenticatedGraphqlRequest(
        SET_OPEN_SIGNUP,
        { communityId, roleId: otherRoleId },
        token,
      );

      expect(response.body.errors?.[0].message).toBe(
        "The role must belong to this community",
      );
    });

    it("closes sign-up when its role is deleted", async () => {
      await openSignup(memberRoleId);
      const token = await staffToken({ canEditRole: true });

      const response = await testApp.authenticatedGraphqlRequest(
        DELETE_ROLE,
        { id: memberRoleId },
        token,
      );
      expect(response.body.errors).toBeUndefined();

      const community = await testApp
        .getDb()
        .community.findUniqueOrThrow({ where: { id: communityId } });
      expect(community.openSignupRoleId).toBeNull();
    });
  });
});
