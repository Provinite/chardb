import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import * as request from 'supertest';
import { DatabaseService } from '../src/database/database.service';
import { execSync } from 'child_process';

// Test utilities for E2E tests
export class TestApp {
  private app: INestApplication;
  private moduleRef: TestingModule;
  private db: DatabaseService;

  async setup(moduleMetadata: any) {
    // Ensure test database is running and migrated
    await this.setupTestDatabase();

    this.moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
          sortSchema: true,
          playground: false,
          introspection: false,
        }),
        JwtModule.register({
          secret: 'test-jwt-secret-key-for-testing-only',
          signOptions: { expiresIn: '15m' },
        }),
        ...moduleMetadata.imports,
      ],
      providers: moduleMetadata.providers || [],
    }).compile();

    this.app = this.moduleRef.createNestApplication();
    this.app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    this.db = this.app.get(DatabaseService);
    await this.app.init();
  }

  async setupTestDatabase() {
    try {
      // Reset test database
      console.log('Setting up test database...');
      execSync('yarn workspace @chardb/backend db:push', { 
        env: { ...process.env, DATABASE_URL: 'postgresql://test_user:test_password@localhost:5440/chardb_test' },
        stdio: 'inherit' 
      });
      console.log('Test database ready');
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  }

  async clearDatabase() {
    // Clear all tables in the correct order (respecting foreign keys)
    await this.db.characterTag.deleteMany({});
    await this.db.imageTag.deleteMany({});
    await this.db.comment.deleteMany({});
    await this.db.like.deleteMany({});
    await this.db.follow.deleteMany({});
    await this.db.image.deleteMany({});
    await this.db.gallery.deleteMany({});
    await this.db.character.deleteMany({});
    await this.db.tag.deleteMany({});
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
      .post('/graphql')
      .set(headers)
      .send({
        query,
        variables,
      });
  }

  async authenticatedGraphqlRequest(query: string, variables = {}, token: string) {
    return this.graphqlRequest(query, variables, {
      'Authorization': `Bearer ${token}`,
    });
  }

  async createTestUser(userData: any = {}) {
    const timestamp = Date.now();
    const defaultUser = {
      username: `testuser_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      displayName: 'Test User',
      passwordHash: '$2b$10$test.hash.for.testing',
      ...userData,
    };
    
    return this.db.user.create({
      data: defaultUser,
    });
  }

  async generateTestToken(userId: string, username?: string) {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { sub: userId, username: username || `testuser_${userId}` },
      process.env.JWT_SECRET || 'development-jwt-secret-key-change-in-production',
      { expiresIn: '15m' }
    );
  }

  getDb(): DatabaseService {
    return this.db;
  }
}

// Mock authentication for testing
export const mockJwtToken = 'mock-jwt-token';
export const mockUser = {
  id: 'test-user-id',
  username: 'testuser',
  email: 'test@example.com',
  displayName: 'Test User',
};

// Common GraphQL queries for testing
export const AUTH_QUERIES = {
  LOGIN: `
    mutation login($input: LoginInput!) {
      login(input: $input) {
        accessToken
        refreshToken
        user {
          id
          username
          email
          displayName
        }
      }
    }
  `,
  
  SIGNUP: `
    mutation signup($input: SignupInput!) {
      signup(input: $input) {
        accessToken
        refreshToken
        user {
          id
          username
          email
          displayName
        }
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
        species
        description
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
        species
        description
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
          species
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
        images {
          id
          originalFilename
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