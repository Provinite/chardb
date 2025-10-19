import { INestApplication } from '@nestjs/common';
import { TestApp, AUTH_QUERIES } from '../../test/setup-e2e';
import { AuthModule } from './auth.module';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import * as bcrypt from 'bcrypt';

describe('AuthResolver (e2e)', () => {
  let testApp: TestApp;
  let app: INestApplication;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, UsersModule],
    });
    app = testApp.getApp();
  });

  beforeEach(async () => {
    // Clear database before each test
    await testApp.clearDatabase();
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe('signup', () => {
    it('should create a new user with valid input', async () => {
      const input = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        displayName: 'New User',
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.signup).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          username: input.username,
          email: input.email,
          displayName: input.displayName,
        },
      });

      // Verify user was created in database
      const db = testApp.getDb();
      const user = await db.user.findUnique({
        where: { email: input.email },
      });

      expect(user).toBeTruthy();
      expect(user!.username).toBe(input.username);
    });

    it('should reject duplicate email', async () => {
      const input = {
        username: 'user1',
        email: 'test@example.com',
        password: 'password123',
        displayName: 'User 1',
      };

      // Create first user
      await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, { input });

      // Try to create second user with same email
      const duplicateInput = {
        ...input,
        username: 'user2',
        displayName: 'User 2',
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input: duplicateInput,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('email already exists');
    });

    it('should reject duplicate username', async () => {
      const input = {
        username: 'testuser',
        email: 'user1@example.com',
        password: 'password123',
        displayName: 'User 1',
      };

      // Create first user
      await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, { input });

      // Try to create second user with same username
      const duplicateInput = {
        ...input,
        email: 'user2@example.com',
        displayName: 'User 2',
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input: duplicateInput,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'username already exists',
      );
    });

    it('should validate email format', async () => {
      const input = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123',
        displayName: 'Test User',
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate password length', async () => {
      const input = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123', // Too short
        displayName: 'Test User',
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const db = testApp.getDb();
      const passwordHash = await bcrypt.hash('password123', 10);

      await db.user.create({
        data: {
          username: 'testuser',
          email: 'test@example.com',
          displayName: 'Test User',
          passwordHash,
        },
      });
    });

    it('should login with valid email and password', async () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.LOGIN, {
        input,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.login).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          username: 'testuser',
          email: 'test@example.com',
          displayName: 'Test User',
        },
      });
    });

    it('should reject invalid email', async () => {
      const input = {
        email: 'wrong@example.com',
        password: 'password123',
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.LOGIN, {
        input,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      const input = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const response = await testApp.graphqlRequest(AUTH_QUERIES.LOGIN, {
        input,
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid credentials');
    });
  });

  describe('me query', () => {
    let testUserId: string;
    let testUsername: string;
    let testEmail: string;
    let testToken: string;

    beforeEach(async () => {
      // Create and authenticate a test user
      const testUser = await testApp.createTestUser();
      testUserId = testUser.id;
      testUsername = testUser.username;
      testEmail = testUser.email;
      testToken = await testApp.generateTestToken(testUserId);
    });

    it('should return user info when authenticated', async () => {
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
        displayName: 'Test User',
      });
    });

    it('should reject unauthenticated requests', async () => {
      const response = await testApp.graphqlRequest(AUTH_QUERIES.ME, {});

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('should reject invalid tokens', async () => {
      const response = await testApp.authenticatedGraphqlRequest(
        AUTH_QUERIES.ME,
        {},
        'invalid-token',
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('refreshToken', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create a user and get refresh token
      const input = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      };

      const signupResponse = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
        input,
      });

      refreshToken = signupResponse.body.data.signup.refreshToken;
    });

    it('should generate new access token with valid refresh token', async () => {
      const response = await testApp.graphqlRequest(
        `
          mutation refreshToken($token: String!) {
            refreshToken(token: $token)
          }
        `,
        { token: refreshToken },
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.refreshToken).toEqual(expect.any(String));
    });

    it('should reject invalid refresh token', async () => {
      const response = await testApp.graphqlRequest(
        `
          mutation refreshToken($token: String!) {
            refreshToken(token: $token)
          }
        `,
        { token: 'invalid-refresh-token' },
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Invalid refresh token',
      );
    });
  });
});
