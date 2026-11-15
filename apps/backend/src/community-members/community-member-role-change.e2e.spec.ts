import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { RolesModule } from "../roles/roles.module";
import { CommunityMembersModule } from "./community-members.module";

const CHANGE_ROLE = `
  mutation ChangeRole($id: ID!, $roleId: ID!) {
    updateCommunityMember(
      id: $id
      updateCommunityMemberInput: { roleId: $roleId }
    ) {
      id
    }
  }
`;

/**
 * Changing a member's role, from the community's own roles.
 *
 * A membership has no community of its own: it is in whichever community its
 * role belongs to. So a role from somewhere else would not change the
 * member's role, it would move them into that other community, past every
 * gate that decides who may join it.
 */
describe("changing a member's role (e2e)", () => {
  let testApp: TestApp;
  const roles = {} as Record<
    "member" | "other" | "staff" | "elsewhere",
    string
  >;
  const memberships = {} as Record<"member" | "staff", string>;
  const sessions = {} as Record<"staff" | "siteAdmin", string>;

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
    await testApp.clearDatabase();

    const here = (await testApp.createTestCommunity("Here")).id;
    const elsewhere = (await testApp.createTestCommunity("Elsewhere")).id;
    roles.member = (await testApp.createTestRole(here)).id;
    roles.other = (await testApp.createTestRole(here)).id;
    roles.staff = (
      await testApp.createTestRole(here, { canManageMemberRoles: true })
    ).id;
    roles.elsewhere = (
      await testApp.createTestRole(elsewhere, {
        canEditRole: true,
        canManageMemberRoles: true,
      })
    ).id;

    const user = async (name: string, account: Record<string, unknown> = {}) =>
      testApp.createTestUser({
        username: `role_${name}`,
        email: `role_${name}@example.com`,
        ...account,
      });
    const member = await user("member");
    const staff = await user("staff");
    const siteAdmin = await user("admin", { isAdmin: true });

    memberships.member = (
      await testApp.createTestCommunityMember(member.id, roles.member)
    ).id;
    memberships.staff = (
      await testApp.createTestCommunityMember(staff.id, roles.staff)
    ).id;
    sessions.staff = await testApp.generateTestToken(staff.id, staff.username);
    sessions.siteAdmin = await testApp.generateTestToken(
      siteAdmin.id,
      siteAdmin.username,
    );
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  const changeRole = (session: string, id: string, roleId: string) =>
    testApp.authenticatedGraphqlRequest(CHANGE_ROLE, { id, roleId }, session);

  const roleOf = async (membershipId: string) =>
    (
      await testApp.getDb().communityMember.findUniqueOrThrow({
        where: { id: membershipId },
      })
    ).roleId;

  it("gives a member another of the community's roles", async () => {
    const response = await changeRole(
      sessions.staff,
      memberships.member,
      roles.other,
    );

    expect(response.body.errors).toBeUndefined();
    expect(await roleOf(memberships.member)).toBe(roles.other);
    await testApp.getDb().communityMember.update({
      where: { id: memberships.member },
      data: { roleId: roles.member },
    });
  });

  it.each([
    ["a member's", "member"],
    ["the staff member's own", "staff"],
  ] as const)(
    "refuses to give %s membership a role from another community",
    async (_case, whose) => {
      const before = await roleOf(memberships[whose]);

      const response = await changeRole(
        sessions.staff,
        memberships[whose],
        roles.elsewhere,
      );

      expect(response.body.errors?.[0]?.message).toBe(
        "That role belongs to another community",
      );
      expect(await roleOf(memberships[whose])).toBe(before);
    },
  );

  it("refuses a site admin too: this changes a role, it does not move a member", async () => {
    const response = await changeRole(
      sessions.siteAdmin,
      memberships.member,
      roles.elsewhere,
    );

    expect(response.body.errors?.[0]?.message).toBe(
      "That role belongs to another community",
    );
    expect(await roleOf(memberships.member)).toBe(roles.member);
  });
});
