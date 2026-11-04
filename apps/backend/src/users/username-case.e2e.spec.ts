import { TestApp, AUTH_QUERIES } from "../../test/setup-e2e";
import { UsersModule } from "./users.module";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { SocialModule } from "../social/social.module";

/**
 * Usernames are one name per spelling, ignoring case: `foo` and `Foo` are the
 * same person, both for lookups and for who may sign up as which. The casing
 * someone signed up with is kept for display.
 */
const USER = `
  query User($username: String!) {
    user(username: $username) {
      id
      username
    }
  }
`;

const USER_PROFILE = `
  query UserProfile($username: String!) {
    userProfile(username: $username) {
      user {
        id
      }
    }
  }
`;

const FOLLOWERS = `
  query Followers($username: String!) {
    getFollowers(username: $username) {
      user {
        id
      }
    }
  }
`;

describe("Username case (e2e)", () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, UsersModule, SocialModule],
    });
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe("lookups", () => {
    it("finds a user under any casing and returns the stored one", async () => {
      const user = await testApp.createTestUser({ username: "MixedCase" });

      const response = await testApp.graphqlRequest(USER, {
        username: "mixedCASE",
      });

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.user).toEqual({
        id: user.id,
        username: "MixedCase",
      });
    });

    it("finds a profile under any casing", async () => {
      const user = await testApp.createTestUser({ username: "MixedCase" });

      const response = await testApp.graphqlRequest(USER_PROFILE, {
        username: "MIXEDCASE",
      });

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.userProfile.user.id).toBe(user.id);
    });

    it("finds a follower list under any casing", async () => {
      const user = await testApp.createTestUser({ username: "MixedCase" });

      const response = await testApp.graphqlRequest(FOLLOWERS, {
        username: "mixedcase",
      });

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.getFollowers.user.id).toBe(user.id);
    });
  });

  describe("uniqueness", () => {
    it("refuses a signup whose username differs only in case", async () => {
      await testApp.createTestUser({ username: "taken" });
      const inviteCode = await testApp.createTestInviteCode();

      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input: {
          username: "Taken",
          email: "second@example.com",
          password: "password123",
          inviteCode,
        },
      });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        "username already exists",
      );
      expect(
        await testApp.getDb().user.count({
          where: { email: "second@example.com" },
        }),
      ).toBe(0);
    });

    it("refuses the loser of two simultaneous signups as a conflict", async () => {
      const inviteCode = await testApp.createTestInviteCode();
      const signup = (username: string, email: string) =>
        testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
          input: { username, email, password: "password123", inviteCode },
        });

      const responses = await Promise.all([
        signup("racer", "one@example.com"),
        signup("Racer", "two@example.com"),
      ]);

      const failures = responses.filter((r) => r.body.errors);
      expect(failures).toHaveLength(1);
      expect(failures[0].body.errors[0].message).toContain(
        "username already exists",
      );
    });

    it("refuses a second spelling at the database", async () => {
      await testApp.createTestUser({ username: "taken" });

      await expect(
        testApp.createTestUser({
          username: "TAKEN",
          email: "second@example.com",
        }),
      ).rejects.toMatchObject({ code: "P2002" });
    });
  });
});
