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

  describe('kickCharacterFromSpecies', () => {
    it('should remove the character from its species and return true', async () => {
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: 'To Kick',
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken
      );

      const characterId = createResponse.body.data.createCharacter.id;

      const kickResponse = await testApp.authenticatedGraphqlRequest(
        `
          mutation kickCharacterFromSpecies($id: ID!) {
            kickCharacterFromSpecies(id: $id)
          }
        `,
        { id: characterId },
        testToken
      );

      expect(kickResponse.status).toBe(200);
      expect(kickResponse.body.errors).toBeUndefined();
      expect(kickResponse.body.data.kickCharacterFromSpecies).toBe(true);

      const fetchResponse = await testApp.authenticatedGraphqlRequest(
        `
          query character($id: ID!) {
            character(id: $id) {
              id
              speciesId
              customFields
            }
          }
        `,
        { id: characterId },
        testToken
      );

      expect(fetchResponse.body.errors).toBeUndefined();
      const updated = fetchResponse.body.data.character;
      expect(updated.speciesId).toBeNull();
      expect(JSON.parse(updated.customFields ?? '{}')).toEqual({});
    });

    it('should return forbidden when the character has no species (no community context to resolve)', async () => {
      // Create a character, kick it once, then try again.
      // After kicking, speciesId is null so the community resolver can't find a
      // community for the character — the guard denies before the service runs.
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: 'Already Kicked',
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken
      );

      const characterId = createResponse.body.data.createCharacter.id;

      await testApp.authenticatedGraphqlRequest(
        `mutation kickCharacterFromSpecies($id: ID!) { kickCharacterFromSpecies(id: $id) }`,
        { id: characterId },
        testToken
      );

      const secondKick = await testApp.authenticatedGraphqlRequest(
        `mutation kickCharacterFromSpecies($id: ID!) { kickCharacterFromSpecies(id: $id) }`,
        { id: characterId },
        testToken
      );

      expect(secondKick.body.errors).toBeDefined();
      expect(secondKick.body.errors[0].message).toContain('Forbidden');
    });
  });

  describe('deleteCharacter', () => {
    it('should delete character when user has canDeleteCharacter permission', async () => {
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

    it('should return forbidden when user lacks canDeleteCharacter permission', async () => {
      // Create a character owned by the privileged user
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: 'Cannot Delete This',
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken
      );
      const characterId = createResponse.body.data.createCharacter.id;

      // Create a second user with a role that explicitly lacks canDeleteCharacter
      const unprivilegedUser = await testApp.createTestUser();
      const { communityId } = await testApp.createTestCommunitySetup(testUserId);
      const readOnlyRole = await testApp.createTestRole(communityId, {
        canCreateCharacter: false,
        canDeleteCharacter: false,
      });
      await testApp.createTestCommunityMember(unprivilegedUser.id, readOnlyRole.id);
      const unprivilegedToken = await testApp.generateTestToken(
        unprivilegedUser.id,
        unprivilegedUser.username
      );

      const deleteResponse = await testApp.authenticatedGraphqlRequest(
        `mutation deleteCharacter($id: ID!) { deleteCharacter(id: $id) }`,
        { id: characterId },
        unprivilegedToken
      );

      expect(deleteResponse.body.errors).toBeDefined();
      expect(deleteResponse.body.errors[0].message).toContain('Forbidden');
    });
  });

  describe('purgeCharacter', () => {
    it('should permanently delete a character when called by a global admin', async () => {
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: 'To Purge',
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken
      );
      const characterId = createResponse.body.data.createCharacter.id;

      const adminUser = await testApp.createTestUser({ isAdmin: true });
      const adminToken = await testApp.generateTestToken(adminUser.id, adminUser.username);

      const purgeResponse = await testApp.authenticatedGraphqlRequest(
        `mutation purgeCharacter($id: ID!) { purgeCharacter(id: $id) }`,
        { id: characterId },
        adminToken
      );

      expect(purgeResponse.status).toBe(200);
      expect(purgeResponse.body.errors).toBeUndefined();
      expect(purgeResponse.body.data.purgeCharacter).toBe(true);

      // Character should be gone — not just hidden, but absent from the DB
      const fetchResponse = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTER,
        { id: characterId }
      );
      expect(fetchResponse.body.errors).toBeDefined();
      expect(fetchResponse.body.errors[0].message).toContain('Character not found');
    });

    it('should return forbidden when called by a non-admin user', async () => {
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: 'Cannot Purge This',
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken
      );
      const characterId = createResponse.body.data.createCharacter.id;

      const purgeResponse = await testApp.authenticatedGraphqlRequest(
        `mutation purgeCharacter($id: ID!) { purgeCharacter(id: $id) }`,
        { id: characterId },
        testToken
      );

      expect(purgeResponse.body.errors).toBeDefined();
      expect(purgeResponse.body.errors[0].message).toContain('Forbidden');
    });
  });
});
