import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  ModuleMetadata,
} from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import * as request from "supertest";
import * as jwt from "jsonwebtoken";
import * as cookieParser from "cookie-parser";
import type { Request, Response } from "express";
import { DatabaseService } from "../src/database/database.service";
import { CustomThrottlerGuard } from "../src/middleware/custom-throttler.guard";
import { OptionalJwtAuthGuard } from "../src/auth/guards/optional-jwt-auth.guard";
// Ensure ModerationStatus and other enums are registered for GraphQL schema generation
import "../src/image-moderation/dto/image-moderation.dto";

// This suite must talk to the throwaway test database, never the development
// one. Outside the primary checkout, scripts/with-instance.mjs puts this
// worktree's *dev* DATABASE_URL in the environment, and a value already in
// process.env beats .env.test -- so point it at the test database explicitly.
// On the primary checkout TEST_DATABASE_URL is unset and .env.test still wins,
// exactly as before.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// NestJS app startup + DB operations can take well over 5s
jest.setTimeout(60000);

// Test utilities for E2E tests
export class TestApp {
  private app: INestApplication;
  private moduleRef: TestingModule;
  private db: DatabaseService;

  async setup(moduleMetadata: Pick<ModuleMetadata, "imports" | "providers">) {
    this.moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ".env.test",
        }),
        ThrottlerModule.forRoot([
          { name: "short", ttl: 1000, limit: 10000 },
          { name: "long", ttl: 60000, limit: 100000 },
        ]),
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
          sortSchema: true,
          playground: false,
          introspection: false,
          // Mirrors the real app's context factory. The auth resolver reaches
          // for `ctx.res` to set the refresh cookie and `ctx.req` to read it
          // back, so leaving this to the driver's default would make every
          // cookie assertion depend on an implementation detail of the driver.
          context: ({ req, res }: { req: Request; res: Response }) => ({
            req,
            res,
          }),
        }),
        JwtModule.register({
          secret: "test-jwt-secret-key-for-testing-only",
          signOptions: { expiresIn: "15m" },
        }),
        ...(moduleMetadata.imports ?? []),
      ],
      providers: moduleMetadata.providers || [],
    }).compile();

    this.app = this.moduleRef.createNestApplication();
    // The refresh token arrives as a cookie, so `req.cookies` has to be
    // populated here exactly as `main.ts` does it.
    this.app.use(cookieParser());
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    this.app.useGlobalGuards(
      this.app.get(CustomThrottlerGuard),
      this.app.get(OptionalJwtAuthGuard),
      this.app.get("PERMISSION_OR_GUARD"),
    );

    this.db = this.app.get(DatabaseService);
    await this.app.init();
  }

  async clearDatabase() {
    // Clear all tables in the correct order (respecting foreign keys)
    await this.db.characterTag.deleteMany({});
    await this.db.imageTag.deleteMany({});
    await this.db.mediaTag.deleteMany({});
    await this.db.comment.deleteMany({});
    await this.db.like.deleteMany({});
    await this.db.follow.deleteMany({});
    await this.db.media.deleteMany({});
    await this.db.image.deleteMany({});
    await this.db.gallery.deleteMany({});
    await this.db.traitReview.deleteMany({});
    await this.db.pendingOwnership.deleteMany({});
    await this.db.characterOwnershipChange.deleteMany({});
    await this.db.character.deleteMany({});
    await this.db.tag.deleteMany({});
    await this.db.inviteCode.deleteMany({});
    await this.db.community.deleteMany({});
    await this.db.user.deleteMany({});
  }

  async teardown() {
    if (this.db) {
      await this.clearDatabase();
      await this.db.$disconnect();
    }
    if (this.app) {
      await this.app.close();
    }
  }

  getApp(): INestApplication {
    return this.app;
  }

  getModuleRef(): TestingModule {
    return this.moduleRef;
  }

  async graphqlRequest(query: string, variables = {}, headers = {}) {
    return request(this.app.getHttpServer())
      .post("/graphql")
      .set(headers)
      .send({
        query,
        variables,
      });
  }

  async authenticatedGraphqlRequest(
    query: string,
    variables = {},
    token: string,
  ) {
    return this.graphqlRequest(query, variables, {
      Authorization: `Bearer ${token}`,
    });
  }

  async createTestUser(userData: Record<string, unknown> = {}) {
    const timestamp = Date.now();
    const defaultUser = {
      username: `testuser_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      displayName: "Test User",
      passwordHash: "$2b$10$test.hash.for.testing",
      ...userData,
    };

    return this.db.user.create({
      data: defaultUser,
    });
  }

  async createTestInviteCode(): Promise<string> {
    const timestamp = Date.now();
    const creator = await this.db.user.create({
      data: {
        username: `invite_creator_${timestamp}`,
        email: `invite_creator_${timestamp}@example.com`,
        passwordHash: "$2b$10$test.hash.for.testing",
      },
    });
    const code = `testcode${timestamp}`;
    await this.db.inviteCode.create({
      data: {
        id: code,
        maxClaims: 1000,
        claimCount: 0,
        creatorId: creator.id,
      },
    });
    return code;
  }

  async createTestCommunity(
    name?: string,
  ): Promise<{ id: string; name: string; slug: string }> {
    const timestamp = Date.now();
    const resolvedName = name ?? `Test Community ${timestamp}`;
    // `slug` is unique like `name` is, so it has to vary with the name and not
    // only with the clock: two communities created in the same millisecond
    // under different names must still get different slugs.
    const slug = `${resolvedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)}-${timestamp}`;

    return this.db.community.create({
      data: { name: resolvedName, slug },
    });
  }

  async createTestSpecies(
    communityId: string,
    name?: string,
  ): Promise<{ id: string; name: string; communityId: string }> {
    const timestamp = Date.now();
    return this.db.species.create({
      data: {
        name: name ?? `Test Species ${timestamp}`,
        communityId,
      },
    });
  }

  async createTestRole(
    communityId: string,
    permissions: Record<string, boolean> = {},
  ): Promise<{ id: string; communityId: string }> {
    const timestamp = Date.now();
    return this.db.role.create({
      data: {
        name: `Test Role ${timestamp}`,
        communityId,
        ...permissions,
      },
    });
  }

  async createTestCommunityMember(
    userId: string,
    roleId: string,
  ): Promise<{ id: string }> {
    return this.db.communityMember.create({
      data: { userId, roleId },
    });
  }

  /** Creates community + full-permission role + species + community member for userId. */
  async createTestCommunitySetup(userId: string): Promise<{
    communityId: string;
    speciesId: string;
    roleId: string;
  }> {
    const community = await this.createTestCommunity();
    const role = await this.createTestRole(community.id, {
      canCreateCharacter: true,
      canEditOwnCharacter: true,
      canEditCharacter: true,
      canEditOwnCharacterRegistry: true,
      canEditCharacterRegistry: true,
      canDeleteCharacter: true,
      canCreateSpecies: true,
      canEditSpecies: true,
      canUploadOwnCharacterImages: true,
      canUploadCharacterImages: true,
    });
    const species = await this.createTestSpecies(community.id);
    await this.createTestCommunityMember(userId, role.id);
    return {
      communityId: community.id,
      speciesId: species.id,
      roleId: role.id,
    };
  }

  async generateTestToken(userId: string, username?: string) {
    return jwt.sign(
      { sub: userId, username: username || `testuser_${userId}` },
      process.env.JWT_SECRET ||
        "development-jwt-secret-key-change-in-production",
      { expiresIn: "15m" },
    );
  }

  getDb(): DatabaseService {
    return this.db;
  }
}

// Mock authentication for testing
export const mockJwtToken = "mock-jwt-token";
export const mockUser = {
  id: "test-user-id",
  username: "testuser",
  email: "test@example.com",
  displayName: "Test User",
};

// Common GraphQL queries for testing
export const AUTH_QUERIES = {
  // The refresh token is not in either payload any more -- it comes back as an
  // HttpOnly `chardb_rt` cookie, so tests that need it read Set-Cookie.
  LOGIN: `
    mutation login($input: LoginInput!) {
      login(input: $input) {
        accessToken
      }
    }
  `,

  SIGNUP: `
    mutation signup($input: SignupInput!) {
      signup(input: $input) {
        accessToken
      }
    }
  `,

  ME: `
    query me {
      me {
        id
        username
        email
        displayName
      }
    }
  `,
};

export const CHARACTER_QUERIES = {
  CREATE_CHARACTER: `
    mutation createCharacter($input: CreateCharacterInput!) {
      createCharacter(input: $input) {
        id
        name
        speciesId
        visibility
        owner {
          id
          username
        }
      }
    }
  `,

  GET_CHARACTER: `
    query character($id: ID!) {
      character(id: $id) {
        id
        name
        speciesId
        visibility
        owner {
          id
          username
        }
      }
    }
  `,

  GET_CHARACTERS: `
    query characters($filters: CharacterFiltersInput) {
      characters(filters: $filters) {
        characters {
          id
          name
          speciesId
          visibility
        }
        total
        hasMore
      }
    }
  `,
};

export const GALLERY_QUERIES = {
  CREATE_GALLERY: `
    mutation createGallery($input: CreateGalleryInput!) {
      createGallery(input: $input) {
        id
        name
        description
        visibility
        owner {
          id
          username
        }
        character {
          id
          name
        }
      }
    }
  `,

  GET_GALLERY: `
    query gallery($id: ID!) {
      gallery(id: $id) {
        id
        name
        description
        visibility
        owner {
          id
          username
        }
      }
    }
  `,

  GET_GALLERIES: `
    query galleries($filters: GalleryFiltersInput) {
      galleries(filters: $filters) {
        galleries {
          id
          name
          visibility
        }
        total
        hasMore
      }
    }
  `,
};
