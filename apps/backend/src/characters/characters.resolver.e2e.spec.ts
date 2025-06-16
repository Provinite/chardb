import { INestApplication } from '@nestjs/common';
import { TestApp, CHARACTER_QUERIES } from '../../test/setup-e2e';
import { CharactersModule } from './characters.module';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { Visibility } from '@chardb/database';

describe('CharactersResolver (e2e)', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let testUserId: string;
  let testToken: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, CharactersModule],
    });
    app = testApp.getApp();

    // Create a test user
    const testUser = await testApp.createTestUser();
    testUserId = testUser.id;
    testToken = await testApp.generateTestToken(testUserId, testUser.username);
  });

  beforeEach(async () => {
    // Clear database before each test
    await testApp.clearDatabase();
    // Recreate test user
    const testUser = await testApp.createTestUser();
    testUserId = testUser.id;
    testToken = await testApp.generateTestToken(testUserId, testUser.username);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe('createCharacter', () => {
    it('should create a character with valid input', async () => {
      const input = {
        name: 'Test Dragon',
        species: 'Dragon',
        description: 'A magnificent test dragon',
        visibility: Visibility.PUBLIC,
      };

      const response = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input },
        testToken
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.createCharacter).toMatchObject({
        name: input.name,
        species: input.species,
        description: input.description,
        visibility: input.visibility,
        owner: {
          id: testUserId,
          username: expect.stringMatching(/^testuser_/),
        },
      });
    });

    it('should require authentication', async () => {
      const input = {
        name: 'Unauthorized Character',
        species: 'Phoenix',
      };

      const response = await testApp.graphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input }
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('should validate required fields', async () => {
      const input = {
        // Missing required 'name' field
        species: 'Dragon',
      };

      const response = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input },
        testToken
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('character query', () => {
    it('should fetch a public character', async () => {
      // First create a character
      const createInput = {
        name: 'Public Dragon',
        species: 'Dragon',
        visibility: Visibility.PUBLIC,
      };

      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input: createInput },
        testToken
      );

      expect(createResponse.body.errors).toBeUndefined();
      const characterId = createResponse.body.data.createCharacter.id;

      // Then fetch it without authentication
      const fetchResponse = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTER,
        { id: characterId }
      );

      expect(fetchResponse.status).toBe(200);
      expect(fetchResponse.body.errors).toBeUndefined();
      expect(fetchResponse.body.data.character).toMatchObject({
        id: characterId,
        name: createInput.name,
        species: createInput.species,
        visibility: createInput.visibility,
      });
    });

    it('should return error for non-existent character', async () => {
      const response = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTER,
        { id: 'non-existent-id' }
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Character not found');
    });

    it('should block access to private characters for non-owners', async () => {
      // Create a private character
      const createInput = {
        name: 'Private Dragon',
        species: 'Dragon',
        visibility: Visibility.PRIVATE,
      };

      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input: createInput },
        testToken
      );

      const characterId = createResponse.body.data.createCharacter.id;

      // Try to fetch it without authentication
      const fetchResponse = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTER,
        { id: characterId }
      );

      expect(fetchResponse.status).toBe(200);
      expect(fetchResponse.body.errors).toBeDefined();
      expect(fetchResponse.body.errors[0].message).toContain('Character is private');
    });
  });

  describe('characters query', () => {
    beforeEach(async () => {
      // Create test characters
      await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: 'Public Dragon',
            species: 'Dragon',
            visibility: Visibility.PUBLIC,
          },
        },
        testToken
      );

      await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: 'Private Phoenix',
            species: 'Phoenix',
            visibility: Visibility.PRIVATE,
          },
        },
        testToken
      );
    });

    it('should fetch paginated characters', async () => {
      const response = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTERS,
        {
          filters: {
            limit: 10,
            offset: 0,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.characters).toMatchObject({
        characters: expect.any(Array),
        total: expect.any(Number),
        hasMore: expect.any(Boolean),
      });
    });

    it('should filter by species', async () => {
      const response = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTERS,
        {
          filters: {
            species: 'Dragon',
            limit: 10,
            offset: 0,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      
      // Should only return Dragon characters
      response.body.data.characters.characters.forEach((char: any) => {
        expect(char.species).toBe('Dragon');
      });
    });

    it('should respect visibility controls', async () => {
      // Fetch all characters without authentication
      const response = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTERS,
        {
          filters: {
            limit: 50,
            offset: 0,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      
      // Should not include private characters in public query
      const privateCharacters = response.body.data.characters.characters.filter(
        (char: any) => char.visibility === Visibility.PRIVATE
      );
      
      expect(privateCharacters).toHaveLength(0);
      
      // Should include public characters
      const publicCharacters = response.body.data.characters.characters.filter(
        (char: any) => char.visibility === Visibility.PUBLIC
      );
      
      expect(publicCharacters.length).toBeGreaterThan(0);
    });
  });

  describe('updateCharacter', () => {
    it('should update character when user is owner', async () => {
      // Create a character
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: 'Original Name',
            species: 'Dragon',
            visibility: Visibility.PUBLIC,
          },
        },
        testToken
      );

      const characterId = createResponse.body.data.createCharacter.id;

      // Update it
      const updateResponse = await testApp.authenticatedGraphqlRequest(
        `
          mutation updateCharacter($id: ID!, $input: UpdateCharacterInput!) {
            updateCharacter(id: $id, input: $input) {
              id
              name
              species
            }
          }
        `,
        {
          id: characterId,
          input: {
            name: 'Updated Name',
            species: 'Phoenix',
          },
        },
        testToken
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.errors).toBeUndefined();
      expect(updateResponse.body.data.updateCharacter).toMatchObject({
        id: characterId,
        name: 'Updated Name',
        species: 'Phoenix',
      });
    });
  });

  describe('deleteCharacter', () => {
    it('should delete character when user is owner', async () => {
      // Create a character
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: 'To Delete',
            species: 'Dragon',
            visibility: Visibility.PUBLIC,
          },
        },
        testToken
      );

      const characterId = createResponse.body.data.createCharacter.id;

      // Delete it
      const deleteResponse = await testApp.authenticatedGraphqlRequest(
        `
          mutation deleteCharacter($id: ID!) {
            deleteCharacter(id: $id)
          }
        `,
        { id: characterId },
        testToken
      );

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.errors).toBeUndefined();
      expect(deleteResponse.body.data.deleteCharacter).toBe(true);

      // Verify it's deleted
      const fetchResponse = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTER,
        { id: characterId }
      );

      expect(fetchResponse.body.errors).toBeDefined();
      expect(fetchResponse.body.errors[0].message).toContain('Character not found');
    });
  });
});