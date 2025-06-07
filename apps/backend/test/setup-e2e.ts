import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';

// Test utilities for E2E tests
export class TestApp {
  private app: INestApplication;
  private moduleRef: TestingModule;

  async setup(moduleMetadata: any) {
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
        ...moduleMetadata.imports,
      ],
      providers: moduleMetadata.providers || [],
    }).compile();

    this.app = this.moduleRef.createNestApplication();
    await this.app.init();
  }

  async teardown() {
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
          originalName
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