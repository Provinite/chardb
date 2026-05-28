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
  let testSpeciesId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, CharactersModule],
    });
    app = testApp.getApp();
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    const testUser = await testApp.createTestUser();
    testUserId = testUser.id;
    testToken = await testApp.generateTestToken(testUserId, testUser.username);
    const setup = await testApp.createTestCommunitySetup(testUserId);
    testSpeciesId = setup.speciesId;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe('createCharacter', () => {
    it('should create a character with valid input', async () => {
      const input = {
        name: 'Test Dragon',
        speciesId: testSpeciesId,
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
        speciesId: testSpeciesId,
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
        speciesId: testSpeciesId,
      };

      const response = await testApp.graphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input }
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
    });

    it('should validate required fields', async () => {
      // Empty name triggers @MinLength(1) class-validator error (HTTP 200 with errors)
      const input = {
        name: '',
        speciesId: testSpeciesId,
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
      const createInput = {
        name: 'Public Dragon',
        speciesId: testSpeciesId,
        visibility: Visibility.PUBLIC,
      };

      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input: createInput },
        testToken
      );

      expect(createResponse.body.errors).toBeUndefined();
      const characterId = createResponse.body.data.createCharacter.id;

      const fetchResponse = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTER,
        { id: characterId }
      );

      expect(fetchResponse.status).toBe(200);
      expect(fetchResponse.body.errors).toBeUndefined();
      expect(fetchResponse.body.data.character).toMatchObject({
        id: characterId,
        name: createInput.name,
        speciesId: testSpeciesId,
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
      const createInput = {
        name: 'Private Dragon',
        speciesId: testSpeciesId,
        visibility: Visibility.PRIVATE,
      };

      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input: createInput },
        testToken
      );

      const characterId = createResponse.body.data.createCharacter.id;

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
      await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: 'Public Dragon',
            speciesId: testSpeciesId,
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
            speciesId: testSpeciesId,
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

    it('should filter by name search', async () => {
      const response = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTERS,
        {
          filters: {
            search: 'Dragon',
            limit: 10,
            offset: 0,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();

      // Should only return characters with 'Dragon' in their name
      response.body.data.characters.characters.forEach((char: { name: string }) => {
        expect(char.name).toContain('Dragon');
      });
    });

    it('should respect visibility controls', async () => {
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
        (char: { visibility: string }) => char.visibility === Visibility.PRIVATE
      );

      expect(privateCharacters).toHaveLength(0);

      // Should include public characters
      const publicCharacters = response.body.data.characters.characters.filter(
        (char: { visibility: string }) => char.visibility === Visibility.PUBLIC
      );

      expect(publicCharacters.length).toBeGreaterThan(0);
    });
  });

  describe('updateCharacterProfile', () => {
    it('should update character when user is owner', async () => {
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: 'Original Name',
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken
      );

      const characterId = createResponse.body.data.createCharacter.id;

      const updateResponse = await testApp.authenticatedGraphqlRequest(
        `
          mutation updateCharacterProfile($id: ID!, $input: UpdateCharacterProfileInput!) {
            updateCharacterProfile(id: $id, input: $input) {
              id
              name
            }
          }
        `,
        {
          id: characterId,
          input: {
            name: 'Updated Name',
          },
        },
        testToken
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.errors).toBeUndefined();
      expect(updateResponse.body.data.updateCharacterProfile).toMatchObject({
        id: characterId,
        name: 'Updated Name',
      });
    });
  });

  describe('deleteCharacter', () => {
    it('should delete character when user is owner', async () => {
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: 'To Delete',
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken
      );

      const characterId = createResponse.body.data.createCharacter.id;

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

      const fetchResponse = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTER,
        { id: characterId }
      );

      expect(fetchResponse.body.errors).toBeDefined();
      expect(fetchResponse.body.errors[0].message).toContain('Character not found');
    });
  });
});
