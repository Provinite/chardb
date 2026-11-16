import { TestApp } from "../../../test/setup-e2e";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth.module";
import { UsersModule } from "../../users/users.module";

const CREATE = `
  mutation Create($input: CreatePersonalAccessTokenInput!) {
    createPersonalAccessToken(input: $input) {
      secret
      token {
        id
        name
        displayHint
        expiresAt
        revokedAt
        globalPermissions
        communities { community { id name } member permissions }
      }
    }
  }
`;

const LIST = `
  query {
    personalAccessTokens { id name lastUsedAt revokedAt }
  }
`;

const REVOKE = `
  mutation Revoke($id: ID!) {
    revokePersonalAccessToken(id: $id) { id revokedAt }
  }
`;

const ME = `query { me { id username } }`;

const CURRENT = `
  query {
    currentAccessToken {
      id
      name
      displayHint
      expiresAt
      globalPermissions
      communities { community { id name slug } member permissions }
    }
  }
`;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A personal access token from minting to refusal. What a live token may do
 * at each kind of gate is in `permission-guards.e2e.spec.ts`.
 */
describe("personal access tokens (e2e)", () => {
  let testApp: TestApp;
  let communityId: string;
  let adminId: string;
  let adminSession: string;
  let otherAdminSession: string;
  let memberSession: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({ imports: [DatabaseModule, AuthModule, UsersModule] });
    await testApp.clearDatabase();

    communityId = (await testApp.createTestCommunity("Tokenville")).id;

    const admin = await testApp.createTestUser({
      username: "pat_admin",
      email: "pat_admin@example.com",
      isAdmin: true,
    });
    adminId = admin.id;
    adminSession = await testApp.generateTestToken(admin.id, admin.username);

    const otherAdmin = await testApp.createTestUser({
      username: "pat_other_admin",
      email: "pat_other_admin@example.com",
      isAdmin: true,
    });
    otherAdminSession = await testApp.generateTestToken(
      otherAdmin.id,
      otherAdmin.username,
    );

    const member = await testApp.createTestUser({
      username: "pat_member",
      email: "pat_member@example.com",
    });
    memberSession = await testApp.generateTestToken(member.id, member.username);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  const input = (overrides: Record<string, unknown> = {}) => ({
    name: "deploy bot",
    expiresInDays: 30,
    communities: [
      { communityId, member: true, permissions: ["canManageItems"] },
    ],
    ...overrides,
  });

  const create = (session: string, overrides: Record<string, unknown> = {}) =>
    testApp.authenticatedGraphqlRequest(
      CREATE,
      { input: input(overrides) },
      session,
    );

  /** Mints a token as the admin and returns its id and secret. */
  const mint = async (overrides: Record<string, unknown> = {}) => {
    const response = await create(adminSession, overrides);
    expect(response.body.errors).toBeUndefined();
    const { secret, token } = response.body.data.createPersonalAccessToken;
    return { secret: secret as string, id: token.id as string };
  };

  const errorCode = (response: { body: { errors?: unknown[] } }) =>
    (response.body.errors?.[0] as { extensions?: { code?: string } })
      ?.extensions?.code;

  describe("creating", () => {
    it("returns the secret once, with the grants as asked", async () => {
      const response = await create(adminSession);

      expect(response.body.errors).toBeUndefined();
      const { secret, token } = response.body.data.createPersonalAccessToken;
      // The test server names no environment and is no production build.
      expect(secret).toMatch(/^chardb_pat_local_[A-Za-z0-9_-]{43}$/);
      expect(token.displayHint).toBe(secret.slice(-4));
      expect(token.communities).toEqual([
        {
          community: { id: communityId, name: "Tokenville" },
          member: true,
          permissions: ["canManageItems"],
        },
      ]);
      expect(token.globalPermissions).toEqual([]);
      const expiresIn = new Date(token.expiresAt).getTime() - Date.now();
      expect(expiresIn).toBeGreaterThan(29 * DAY_MS);
      expect(expiresIn).toBeLessThanOrEqual(30 * DAY_MS);

      const stored = await testApp
        .getDb()
        .personalAccessToken.findUniqueOrThrow({ where: { id: token.id } });
      expect(stored.tokenHash).not.toContain(secret);
      expect(JSON.stringify(stored)).not.toContain(secret);
    });

    it("refuses a caller who is not a site admin", async () => {
      expect(errorCode(await create(memberSession))).toBe("FORBIDDEN");
    });

    it("grants global permissions the creator holds", async () => {
      const response = await create(adminSession, {
        globalPermissions: ["isAdmin"],
      });

      expect(response.body.errors).toBeUndefined();
      expect(
        response.body.data.createPersonalAccessToken.token.globalPermissions,
      ).toEqual(["isAdmin"]);
    });

    it("grants global permissions alone, with no community", async () => {
      const response = await create(adminSession, {
        communities: [],
        globalPermissions: ["isAdmin"],
      });

      expect(response.body.errors).toBeUndefined();
      const { token } = response.body.data.createPersonalAccessToken;
      expect(token.communities).toEqual([]);
      expect(token.globalPermissions).toEqual(["isAdmin"]);
    });

    it("refuses canGrantGlobalPermissions, even to a creator who holds it", async () => {
      const db = testApp.getDb();
      await db.user.update({
        where: { id: adminId },
        data: { canGrantGlobalPermissions: true },
      });
      const before = await db.personalAccessToken.count();

      try {
        const response = await create(adminSession, {
          globalPermissions: ["canGrantGlobalPermissions"],
        });

        expect(response.body.errors).toBeDefined();
        expect(await db.personalAccessToken.count()).toBe(before);
      } finally {
        await db.user.update({
          where: { id: adminId },
          data: { canGrantGlobalPermissions: false },
        });
      }
    });

    it.each([
      [
        "an unknown permission",
        {
          communities: [
            { communityId, member: false, permissions: ["canRuleTheWorld"] },
          ],
        },
      ],
      [
        "membership spelled as a permission",
        {
          communities: [
            { communityId, member: false, permissions: ["__ANY__"] },
          ],
        },
      ],
      [
        "a community granted nothing",
        { communities: [{ communityId, member: false, permissions: [] }] },
      ],
      [
        "a community granted twice",
        {
          communities: [
            { communityId, member: true, permissions: [] },
            { communityId, member: true, permissions: [] },
          ],
        },
      ],
      [
        "a community that does not exist",
        {
          communities: [
            {
              communityId: "00000000-0000-4000-8000-000000000000",
              member: true,
              permissions: [],
            },
          ],
        },
      ],
      ["no community and no global permission", { communities: [] }],
      [
        "a global permission the creator does not hold",
        { globalPermissions: ["canListUsers"] },
      ],
      ["an unknown global permission", { globalPermissions: ["canFly"] }],
      ["an unsupported lifetime", { expiresInDays: 3650 }],
      ["a blank name", { name: "   " }],
    ])("refuses %s", async (_case, overrides) => {
      const before = await testApp.getDb().personalAccessToken.count();

      const response = await create(adminSession, overrides);

      expect(response.body.errors).toBeDefined();
      expect(errorCode(response)).not.toBe("FORBIDDEN");
      expect(await testApp.getDb().personalAccessToken.count()).toBe(before);
    });

    it("offers every community and every community permission", async () => {
      const response = await testApp.authenticatedGraphqlRequest(
        `query { personalAccessTokenGrantOptions { communities { id } permissions globalPermissions lifetimesDays } }`,
        {},
        adminSession,
      );

      const options = response.body.data.personalAccessTokenGrantOptions;
      expect(options.communities).toEqual([{ id: communityId }]);
      expect(options.permissions).toContain("canManageItems");
      expect(options.permissions).not.toContain("__ANY__");
      expect(options.lifetimesDays).toEqual([7, 30, 90, 365]);
    });

    it("offers only the global permissions the caller holds, never canGrantGlobalPermissions", async () => {
      const db = testApp.getDb();
      await db.user.update({
        where: { id: adminId },
        data: { canListUsers: true, canGrantGlobalPermissions: true },
      });

      try {
        const response = await testApp.authenticatedGraphqlRequest(
          `query { personalAccessTokenGrantOptions { globalPermissions } }`,
          {},
          adminSession,
        );

        expect(
          response.body.data.personalAccessTokenGrantOptions.globalPermissions,
        ).toEqual(["canListUsers", "isAdmin"]);
      } finally {
        await db.user.update({
          where: { id: adminId },
          data: { canListUsers: false, canGrantGlobalPermissions: false },
        });
      }
    });
  });

  describe("authenticating", () => {
    it("acts as its owner", async () => {
      const { secret } = await mint();

      const response = await testApp.authenticatedGraphqlRequest(
        ME,
        {},
        secret,
      );

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.me).toEqual({
        id: adminId,
        username: "pat_admin",
      });
    });

    it("records when it was last used", async () => {
      const { secret, id } = await mint();

      await testApp.authenticatedGraphqlRequest(ME, {}, secret);

      // Written without the request waiting on it.
      await new Promise((resolve) => setTimeout(resolve, 200));
      const stored = await testApp
        .getDb()
        .personalAccessToken.findUniqueOrThrow({ where: { id } });
      expect(stored.lastUsedAt).not.toBeNull();
    });

    const refused = async (secret: string) => {
      const response = await testApp.authenticatedGraphqlRequest(
        ME,
        {},
        secret,
      );
      expect(response.body.data?.me ?? null).toBeNull();
      expect(errorCode(response)).toBe("UNAUTHENTICATED");
      return response.body.errors[0].message as string;
    };

    it("refuses a secret that matches no token", async () => {
      expect(await refused("chardb_pat_local_not-a-real-token")).toBe(
        "Access token is invalid, expired or revoked",
      );
    });

    it("says so when a token is for another environment", async () => {
      const { secret } = await mint();
      const elsewhere = secret.replace("chardb_pat_local_", "chardb_pat_prod_");

      expect(await refused(elsewhere)).toBe(
        "This access token belongs to another environment",
      );
    });

    it("refuses a secret that names no environment", async () => {
      expect(await refused("chardb_pat_abc")).toBe(
        "Access token is invalid, expired or revoked",
      );
    });

    it("refuses a revoked token", async () => {
      const { secret, id } = await mint();

      const revoked = await testApp.authenticatedGraphqlRequest(
        REVOKE,
        { id },
        adminSession,
      );
      expect(
        revoked.body.data.revokePersonalAccessToken.revokedAt,
      ).toBeTruthy();

      await refused(secret);
    });

    it("refuses an expired token", async () => {
      const { secret, id } = await mint();
      await testApp.getDb().personalAccessToken.update({
        where: { id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await refused(secret);
    });

    it("refuses a token whose owner is no longer a site admin", async () => {
      const { secret } = await mint();
      await testApp
        .getDb()
        .user.update({ where: { id: adminId }, data: { isAdmin: false } });

      try {
        await refused(secret);
      } finally {
        await testApp
          .getDb()
          .user.update({ where: { id: adminId }, data: { isAdmin: true } });
      }
    });
  });

  describe("reading itself", () => {
    it("shows the token it was called with, with its grants", async () => {
      const { secret, id } = await mint({ globalPermissions: ["isAdmin"] });

      const response = await testApp.authenticatedGraphqlRequest(
        CURRENT,
        {},
        secret,
      );

      expect(response.body.errors).toBeUndefined();
      const current = response.body.data.currentAccessToken;
      expect(current.id).toBe(id);
      expect(current.name).toBe("deploy bot");
      expect(current.displayHint).toBe(secret.slice(-4));
      expect(current.communities).toEqual([
        {
          community: {
            id: communityId,
            name: "Tokenville",
            slug: expect.any(String),
          },
          member: true,
          permissions: ["canManageItems"],
        },
      ]);
      expect(current.globalPermissions).toEqual(["isAdmin"]);
    });

    it("is null for a session", async () => {
      const response = await testApp.authenticatedGraphqlRequest(
        CURRENT,
        {},
        adminSession,
      );

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.currentAccessToken).toBeNull();
    });

    it("refuses an anonymous caller", async () => {
      const response = await testApp.graphqlRequest(CURRENT);

      expect(response.body.data?.currentAccessToken ?? null).toBeNull();
      expect(response.body.errors).toBeDefined();
    });
  });

  describe("what a token may never do", () => {
    it.each([
      ["a token", {}],
      ["a token granted isAdmin", { globalPermissions: ["isAdmin"] }],
    ])("%s cannot mint, list or revoke tokens", async (_case, overrides) => {
      const { secret, id } = await mint(overrides);

      expect(
        errorCode(
          await testApp.authenticatedGraphqlRequest(
            CREATE,
            { input: input() },
            secret,
          ),
        ),
      ).toBe("FORBIDDEN");
      expect(
        errorCode(await testApp.authenticatedGraphqlRequest(LIST, {}, secret)),
      ).toBe("FORBIDDEN");
      expect(
        errorCode(
          await testApp.authenticatedGraphqlRequest(REVOKE, { id }, secret),
        ),
      ).toBe("FORBIDDEN");
      expect(
        errorCode(
          await testApp.authenticatedGraphqlRequest(
            `query { personalAccessTokenGrantOptions { lifetimesDays } }`,
            {},
            secret,
          ),
        ),
      ).toBe("FORBIDDEN");
    });

    it("cannot change its owner's profile", async () => {
      const { secret } = await mint();

      const response = await testApp.authenticatedGraphqlRequest(
        `mutation { updateProfile(input: { displayName: "Taken over" }) { id } }`,
        {},
        secret,
      );

      expect(errorCode(response)).toBe("FORBIDDEN");
    });

    it("cannot sign in, sign out or refresh a session", async () => {
      const { secret } = await mint();

      for (const mutation of [
        `mutation { logout }`,
        `mutation { refreshToken }`,
        `mutation { login(input: { email: "pat_admin@example.com", password: "x" }) { accessToken } }`,
      ]) {
        const response = await testApp.authenticatedGraphqlRequest(
          mutation,
          {},
          secret,
        );
        expect(errorCode(response)).toBe("FORBIDDEN");
      }
    });
  });

  describe("listing and revoking", () => {
    it("lists only the caller's own tokens", async () => {
      const { id } = await mint();

      const mine = await testApp.authenticatedGraphqlRequest(
        LIST,
        {},
        adminSession,
      );
      const theirs = await testApp.authenticatedGraphqlRequest(
        LIST,
        {},
        otherAdminSession,
      );

      expect(
        mine.body.data.personalAccessTokens.map((t: { id: string }) => t.id),
      ).toContain(id);
      expect(theirs.body.data.personalAccessTokens).toEqual([]);
    });

    it("cannot revoke another admin's token", async () => {
      const { id, secret } = await mint();

      const response = await testApp.authenticatedGraphqlRequest(
        REVOKE,
        { id },
        otherAdminSession,
      );

      expect(response.body.errors[0].message).toBe("Access token not found");
      const me = await testApp.authenticatedGraphqlRequest(ME, {}, secret);
      expect(me.body.data.me.id).toBe(adminId);
    });
  });
});
