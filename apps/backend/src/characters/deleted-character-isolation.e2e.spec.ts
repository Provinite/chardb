import { INestApplication } from '@nestjs/common';
import { TestApp } from '../../test/setup-e2e';
import { CharactersModule } from './characters.module';
import { CommentsModule } from '../comments/comments.module';
import { SocialModule } from '../social/social.module';
import { SpeciesModule } from '../species/species.module';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { Visibility } from '@chardb/database';

/**
 * Verifies that soft-deleted characters are invisible across all services
 * that were updated to include the notDeleted filter.
 */
describe('Deleted character cross-service isolation (e2e)', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let testUserId: string;
  let testToken: string;
  let testSpeciesId: string;

  // A character that is soft-deleted before each test that uses it
  let deletedCharacterId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, CharactersModule, CommentsModule, SocialModule, SpeciesModule],
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

    // Create and immediately soft-delete a character for use in each test
    const db = testApp.getDb();
    const character = await db.character.create({
      data: {
        name: 'Deleted Character',
        ownerId: testUserId,
        creatorId: testUserId,
        visibility: Visibility.PUBLIC,
        speciesId: testSpeciesId,
        deletedAt: new Date(),
      },
    });
    deletedCharacterId = character.id;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe('comments on deleted character', () => {
    it('should reject createComment targeting a soft-deleted character', async () => {
      const response = await testApp.authenticatedGraphqlRequest(
        `mutation createComment($input: CreateCommentInput!) {
          createComment(input: $input) { id content }
        }`,
        {
          input: {
            entityType: 'CHARACTER',
            entityId: deletedCharacterId,
            content: 'Should not be posted',
          },
        },
        testToken
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('character not found');
    });
  });

  describe('likes on deleted character', () => {
    it('should reject toggleLike targeting a soft-deleted character', async () => {
      const response = await testApp.authenticatedGraphqlRequest(
        `mutation toggleLike($input: ToggleLikeInput!) {
          toggleLike(input: $input) { isLiked likesCount }
        }`,
        {
          input: {
            entityType: 'CHARACTER',
            entityId: deletedCharacterId,
          },
        },
        testToken
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      // validateEntity throws BadRequestException when the character isn't found
      expect(response.body.errors[0].message).toContain('character not found');
    });
  });

  describe('species deletion respects soft-deleted characters', () => {
    it('should allow deleting a species once its only character has been soft-deleted', async () => {
      // Create a fresh species with one character, then soft-delete the character
      const db = testApp.getDb();
      const setup = await testApp.createTestCommunitySetup(testUserId);
      const freshSpeciesId = setup.speciesId;

      await db.character.create({
        data: {
          name: 'Only Character',
          ownerId: testUserId,
          creatorId: testUserId,
          visibility: Visibility.PUBLIC,
          speciesId: freshSpeciesId,
          deletedAt: new Date(),
        },
      });

      // The species.remove guard counts non-deleted characters — should be 0
      const deleteResponse = await testApp.authenticatedGraphqlRequest(
        `mutation removeSpecies($id: ID!) { removeSpecies(id: $id) { removed } }`,
        { id: freshSpeciesId },
        testToken
      );

      // No character-count error; species deletion should succeed
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.errors).toBeUndefined();
      expect(deleteResponse.body.data.removeSpecies.removed).toBe(true);
    });

    it('should block species deletion when a live character still uses it', async () => {
      const db = testApp.getDb();
      const setup = await testApp.createTestCommunitySetup(testUserId);
      const freshSpeciesId = setup.speciesId;

      await db.character.create({
        data: {
          name: 'Live Character',
          ownerId: testUserId,
          creatorId: testUserId,
          visibility: Visibility.PUBLIC,
          speciesId: freshSpeciesId,
        },
      });

      const deleteResponse = await testApp.authenticatedGraphqlRequest(
        `mutation removeSpecies($id: ID!) { removeSpecies(id: $id) { removed } }`,
        { id: freshSpeciesId },
        testToken
      );

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.errors).toBeDefined();
      expect(deleteResponse.body.errors[0].message).toContain('character');
    });
  });
});
