import { TestApp } from "../../../test/setup-e2e";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth.module";
import { UsersModule } from "../../users/users.module";
import { PersonalAccessTokensService } from "./personal-access-tokens.service";

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
  const mint = async () => {
    const response = await create(adminSession);
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
      ["no community", { communities: [] }],
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
        `query { personalAccessTokenGrantOptions { communities { id } permissions lifetimesDays } }`,
        {},
        adminSession,
      );

      const options = response.body.data.personalAccessTokenGrantOptions;
      expect(options.communities).toEqual([{ id: communityId }]);
      expect(options.permissions).toContain("canManageItems");
      expect(options.permissions).not.toContain("__ANY__");
      expect(options.lifetimesDays).toEqual([7, 30, 90, 365]);
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

    // Demotion is permanent for tokens: an admin demoted because their
    // account may be compromised, then reinstated, gets no leaked token back.
    //
    // The database revokes them as the owner is demoted, by a trigger this
    // suite's `db push`-ed schema does not have; the browser suite's
    // access-tokens spec covers that. This is the backstop: the first use by
    // an owner who is no admin revokes every token of theirs.
    it("revokes every token of a demoted owner when one is used, for good", async () => {
      const first = await mint();
      const second = await mint();
      const other = await testApp.createTestUser({
        username: "pat_bystander",
        email: "pat_bystander@example.com",
        isAdmin: true,
      });
      const bystanders = await testApp
        .getApp()
        .get(PersonalAccessTokensService)
        .create(other.id, input());

      await testApp
        .getDb()
        .user.update({ where: { id: adminId }, data: { isAdmin: false } });
      await refused(first.secret);
      const revoked = await testApp.getDb().personalAccessToken.findMany({
        where: { id: { in: [first.id, second.id, bystanders.token.id] } },
        select: { id: true, revokedAt: true },
      });
      await testApp
        .getDb()
        .user.update({ where: { id: adminId }, data: { isAdmin: true } });

      expect(
        Object.fromEntries(revoked.map((t) => [t.id, t.revokedAt !== null])),
      ).toEqual({
        [first.id]: true,
        [second.id]: true,
        [bystanders.token.id]: false,
      });
      // Reinstated, and still refused.
      await refused(first.secret);
    });
  });

  describe("what a token may never do", () => {
    it("cannot mint, list or revoke tokens", async () => {
      const { secret, id } = await mint();

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
