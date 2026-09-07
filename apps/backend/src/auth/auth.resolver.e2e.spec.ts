import { TestApp, AUTH_QUERIES } from "../../test/setup-e2e";
import { AuthModule } from "./auth.module";
import { DatabaseModule } from "../database/database.module";
import { UsersModule } from "../users/users.module";
import * as bcrypt from "bcrypt";
import { createHash } from "node:crypto";
import { refreshCookieName } from "./refresh-cookie";

const COOKIE = refreshCookieName();

/**
 * The refresh token off a response's Set-Cookie header.
 *
 * It used to be a field on the payload, which made it trivial to read and
 * equally trivial for any script on the page to read. It is `HttpOnly` now, so
 * the only place it appears is here.
 */
function refreshCookie(response: {
  headers: Record<string, string | string[] | undefined>;
}): string | undefined {
  const raw = response.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const match = cookies.find((c) => c.startsWith(`${COOKIE}=`));
  if (!match) return undefined;

  const value = match.slice(COOKIE.length + 1).split(";")[0];
  return value || undefined;
}

describe("AuthResolver (e2e)", () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, UsersModule],
    });
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe("signup", () => {
    it("should create a new user with valid input", async () => {
      const inviteCode = await testApp.createTestInviteCode();
      const input = {
        username: "newuser",
        email: "newuser@example.com",
        password: "password123",
        displayName: "New User",
        inviteCode,
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.signup).toBe(true);

      // No session: the account cannot be used until its address is confirmed,
      // so there is nothing to hand back and no refresh cookie to set.
      expect(refreshCookie(response)).toBeUndefined();

      // Verify user was created in database
      const db = testApp.getDb();
      const user = await db.user.findUnique({
        where: { email: input.email },
      });

      expect(user).toBeTruthy();
      expect(user!.username).toBe(input.username);
      expect(user!.isVerified).toBe(false);
    });

    it("mints a verification token for the new address", async () => {
      const inviteCode = await testApp.createTestInviteCode();
      // No `displayName`: it is nullable in the schema, so leaving it out has
      // to be accepted rather than failing validation.
      const input = {
        username: "newuser",
        email: "NewUser@Example.com",
        password: "password123",
        inviteCode,
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input,
      });
      expect(response.body.errors).toBeUndefined();

      const db = testApp.getDb();
      const tokens = await db.emailVerificationToken.findMany({
        where: { email: "newuser@example.com" },
      });

      expect(tokens).toHaveLength(1);
      // Hashed at rest, and never a `.`, so it survives a URL path segment.
      expect(tokens[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(tokens[0].used).toBe(false);
    });

    it("should reject duplicate email", async () => {
      const inviteCode = await testApp.createTestInviteCode();
      const input = {
        username: "user1",
        email: "test@example.com",
        password: "password123",
        displayName: "User 1",
        inviteCode,
      };

      // Create first user
      await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, { input });

      // Try to create second user with same email (invite code still has claims remaining)
      const duplicateInput = {
        ...input,
        username: "user2",
        displayName: "User 2",
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input: duplicateInput,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain("email already exists");
    });

    it("should reject duplicate username", async () => {
      const inviteCode = await testApp.createTestInviteCode();
      const input = {
        username: "testuser",
        email: "user1@example.com",
        password: "password123",
        displayName: "User 1",
        inviteCode,
      };

      // Create first user
      await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, { input });

      // Try to create second user with same username
      const duplicateInput = {
        ...input,
        email: "user2@example.com",
        displayName: "User 2",
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input: duplicateInput,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        "username already exists",
      );
    });

    it("should validate email format", async () => {
      const input = {
        username: "testuser",
        email: "invalid-email",
        password: "password123",
        displayName: "Test User",
        inviteCode: "dummy-code",
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
    });

    it("should validate password length", async () => {
      const input = {
        username: "testuser",
        email: "test@example.com",
        password: "123", // Too short
        displayName: "Test User",
        inviteCode: "dummy-code",
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe("login", () => {
    beforeEach(async () => {
      const db = testApp.getDb();
      const passwordHash = await bcrypt.hash("password123", 10);

      await db.user.create({
        data: {
          username: "testuser",
          email: "test@example.com",
          displayName: "Test User",
          passwordHash,
          isVerified: true,
        },
      });
    });

    it("should login with valid email and password", async () => {
      const input = {
        email: "test@example.com",
        password: "password123",
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.LOGIN, {
        input,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.login).toMatchObject({
        accessToken: expect.any(String),
      });
      expect(refreshCookie(response)).toEqual(expect.any(String));
    });

    it("should reject invalid email", async () => {
      const input = {
        email: "wrong@example.com",
        password: "password123",
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.LOGIN, {
        input,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain("Invalid credentials");
    });

    it("should reject invalid password", async () => {
      const input = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.LOGIN, {
        input,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain("Invalid credentials");
    });

    it("refuses an account whose address was never confirmed", async () => {
      const db = testApp.getDb();
      await db.user.create({
        data: {
          username: "unconfirmed",
          email: "unconfirmed@example.com",
          passwordHash: await bcrypt.hash("password123", 10),
          isVerified: false,
        },
      });

      const response = await testApp.graphqlRequest(AUTH_QUERIES.LOGIN, {
        input: {
          email: "unconfirmed@example.com",
          password: "password123",
        },
      });

      expect(response.status).toBe(200);
      // A code, not prose: the login screen branches on this to offer a resend
      // instead of "try again".
      expect(response.body.errors[0].extensions.code).toBe(
        "EMAIL_NOT_VERIFIED",
      );
      expect(refreshCookie(response)).toBeUndefined();
    });

    it("does not distinguish an unconfirmed account from a wrong password", async () => {
      const db = testApp.getDb();
      await db.user.create({
        data: {
          username: "unconfirmed",
          email: "unconfirmed@example.com",
          passwordHash: await bcrypt.hash("password123", 10),
          isVerified: false,
        },
      });

      const response = await testApp.graphqlRequest(AUTH_QUERIES.LOGIN, {
        input: {
          email: "unconfirmed@example.com",
          password: "wrongpassword",
        },
      });

      // Answering "unconfirmed" here would make the login form a way to test
      // which addresses are registered, without knowing any password.
      expect(response.body.errors[0].message).toContain("Invalid credentials");
    });
  });

  describe("email verification", () => {
    const password = "password123";

    const signupWith = async (email: string): Promise<void> => {
      const inviteCode = await testApp.createTestInviteCode();
      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input: {
          username: `user_${Date.now()}`,
          email,
          password,
          inviteCode,
        },
      });
      // Asserted, or a rejected signup would leave every count below at zero
      // and the caps would look enforced when nothing had been sent at all.
      expect(response.body.errors).toBeUndefined();
    };

    it("confirms the account when the link is followed", async () => {
      const db = testApp.getDb();
      const user = await testApp.createTestUser({
        email: "redeem@example.com",
        passwordHash: await bcrypt.hash(password, 10),
        isVerified: false,
      });

      // Minted here rather than read out of the email: the raw token is never
      // stored, and only its SHA-256 is, so the mail is the only place it ever
      // appears. Writing the row directly exercises the same redemption path.
      const token = "b".repeat(64);
      await db.emailVerificationToken.create({
        data: {
          userId: user.id,
          email: user.email,
          tokenHash: createHash("sha256").update(token).digest("hex"),
          expiresAt: new Date(Date.now() + 60_000),
        },
      });

      const response = await testApp.graphqlRequest(AUTH_QUERIES.VERIFY_EMAIL, {
        input: { token },
      });

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.verifyEmail).toBe(true);

      const after = await db.user.findUnique({ where: { id: user.id } });
      expect(after!.isVerified).toBe(true);

      // ...and the account can now sign in, which is the whole point.
      const login = await testApp.graphqlRequest(AUTH_QUERIES.LOGIN, {
        input: { email: "redeem@example.com", password },
      });
      expect(login.body.data.login.accessToken).toEqual(expect.any(String));
    });

    it("rejects a token nobody minted", async () => {
      const response = await testApp.graphqlRequest(AUTH_QUERIES.VERIFY_EMAIL, {
        input: { token: "c".repeat(64) },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain("Invalid or expired");
    });

    it("never mints more tokens for an address than it is allowed", async () => {
      const email = "capped@example.com";
      await signupWith(email);

      const db = testApp.getDb();
      for (let i = 0; i < 10; i += 1) {
        const response = await testApp.graphqlRequest(
          AUTH_QUERIES.RESEND_VERIFICATION_EMAIL,
          { input: { email } },
        );
        // Always true, whatever happened: an answer that varied would say
        // whether the address is registered.
        expect(response.body.data.resendVerificationEmail).toBe(true);
      }

      const minted = await db.emailVerificationToken.count({
        where: { email },
      });
      expect(minted).toBeGreaterThan(0);
      expect(minted).toBeLessThanOrEqual(6);
    });

    it("says yes for an address with no account, and mints nothing", async () => {
      const response = await testApp.graphqlRequest(
        AUTH_QUERIES.RESEND_VERIFICATION_EMAIL,
        { input: { email: "nobody@example.com" } },
      );

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.resendVerificationEmail).toBe(true);

      const db = testApp.getDb();
      const minted = await db.emailVerificationToken.count({
        where: { email: "nobody@example.com" },
      });
      expect(minted).toBe(0);
    });
  });

  describe("me query", () => {
    let testUserId: string;
    let testUsername: string;
    let testEmail: string;
    let testToken: string;

    beforeEach(async () => {
      const testUser = await testApp.createTestUser();
      testUserId = testUser.id;
      testUsername = testUser.username;
      testEmail = testUser.email;
      testToken = await testApp.generateTestToken(testUserId);
    });

    it("should return user info when authenticated", async () => {
      const response = await testApp.authenticatedGraphqlRequest(
        AUTH_QUERIES.ME,
        {},
        testToken,
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.me).toMatchObject({
        id: testUserId,
        username: testUsername,
        email: testEmail,
        displayName: "Test User",
      });
    });

    it("should reject unauthenticated requests", async () => {
      const response = await testApp.graphqlRequest(AUTH_QUERIES.ME, {});

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe("FORBIDDEN");
    });

    it("should reject invalid tokens", async () => {
      const response = await testApp.authenticatedGraphqlRequest(
        AUTH_QUERIES.ME,
        {},
        "invalid-token",
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe("FORBIDDEN");
    });
  });

  describe("refreshToken", () => {
    let cookie: string;

    // Signed in rather than signed up: signup issues no cookie any more, since
    // a brand new account cannot hold a session until it is confirmed.
    beforeEach(async () => {
      const db = testApp.getDb();
      await db.user.create({
        data: {
          username: "testuser",
          email: "test@example.com",
          displayName: "Test User",
          passwordHash: await bcrypt.hash("password123", 10),
          isVerified: true,
        },
      });

      const loginResponse = await testApp.graphqlRequest(AUTH_QUERIES.LOGIN, {
        input: { email: "test@example.com", password: "password123" },
      });

      const value = refreshCookie(loginResponse);
      if (!value) throw new Error("login did not set a refresh cookie");
      cookie = `${COOKIE}=${value}`;
    });

    it("should generate a new access token from the refresh cookie", async () => {
      const response = await testApp.graphqlRequest(
        `
          mutation refreshToken {
            refreshToken
          }
        `,
        {},
        { Cookie: cookie },
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.refreshToken).toEqual(expect.any(String));
    });

    it("should reject a request with no refresh cookie", async () => {
      const response = await testApp.graphqlRequest(`
        mutation refreshToken {
          refreshToken
        }
      `);

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain("No refresh token");
    });

    it("should reject an invalid refresh cookie", async () => {
      const response = await testApp.graphqlRequest(
        `
          mutation refreshToken {
            refreshToken
          }
        `,
        {},
        { Cookie: `${COOKIE}=invalid-refresh-token` },
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        "Invalid refresh token",
      );
    });

    // A token the server will not honour is never going to start working, so
    // the resolver drops it rather than leaving the browser to keep sending it.
    it("should clear the cookie when it rejects one", async () => {
      const response = await testApp.graphqlRequest(
        `
          mutation refreshToken {
            refreshToken
          }
        `,
        {},
        { Cookie: `${COOKIE}=invalid-refresh-token` },
      );

      const raw = response.headers["set-cookie"];
      const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
      expect(cookies.some((c: string) => c.startsWith(`${COOKIE}=;`))).toBe(
        true,
      );
    });
  });

  describe("logout", () => {
    it("should clear the refresh cookie", async () => {
      const response = await testApp.graphqlRequest(`
        mutation logout {
          logout
        }
      `);

      expect(response.status).toBe(200);
      expect(response.body.data.logout).toBe(true);

      const raw = response.headers["set-cookie"];
      const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
      expect(cookies.some((c: string) => c.startsWith(`${COOKIE}=;`))).toBe(
        true,
      );
    });
  });
});
