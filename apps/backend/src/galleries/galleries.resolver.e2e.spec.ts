import { INestApplication } from '@nestjs/common';
import { TestApp, GALLERY_QUERIES } from '../../test/setup-e2e';
import { GalleriesModule } from './galleries.module';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { Visibility } from '@chardb/database';

describe('GalleriesResolver (e2e)', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let testUserId: string;
  let testUsername: string;
  let testToken: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, GalleriesModule],
    });
    app = testApp.getApp();
  });

  beforeEach(async () => {
    // Clear database before each test
    await testApp.clearDatabase();
    // Recreate test user
    const testUser = await testApp.createTestUser();
    testUserId = testUser.id;
    testUsername = testUser.username;
    testToken = await testApp.generateTestToken(testUserId);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe('createGallery', () => {
    it('should create a gallery with valid input', async () => {
      const input = {
        name: 'Test Gallery',
        description: 'A test gallery for artwork',
        visibility: Visibility.PUBLIC,
        sortOrder: 0,
      };

      const response = await testApp.authenticatedGraphqlRequest(
        GALLERY_QUERIES.CREATE_GALLERY,
        { input },
        testToken
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.createGallery).toMatchObject({
        name: input.name,
        description: input.description,
        visibility: input.visibility,
        owner: {
          id: testUserId,
          username: testUsername,
        },
      });
    });

    it('should require authentication', async () => {
      const input = {
        name: 'Unauthorized Gallery',
        visibility: Visibility.PUBLIC,
      };

      const response = await testApp.graphqlRequest(
        GALLERY_QUERIES.CREATE_GALLERY,
        { input }
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('should create gallery with character association', async () => {
      // First create a character
      const db = testApp.getDb();
      const character = await db.character.create({
        data: {
          name: 'Test Character',
          ownerId: testUserId,
          creatorId: testUserId,
          visibility: Visibility.PUBLIC,
        },
      });

      const input = {
        name: 'Character Gallery',
        characterId: character.id,
        visibility: Visibility.PUBLIC,
      };

      const response = await testApp.authenticatedGraphqlRequest(
        GALLERY_QUERIES.CREATE_GALLERY,
        { input },
        testToken
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.createGallery).toMatchObject({
        name: input.name,
        character: {
          id: character.id,
          name: 'Test Character',
        },
      });
    });
  });

  describe('gallery query', () => {
    it('should fetch a public gallery', async () => {
      // Create a gallery
      const createResponse = await testApp.authenticatedGraphqlRequest(
        GALLERY_QUERIES.CREATE_GALLERY,
        {
          input: {
            name: 'Public Gallery',
            visibility: Visibility.PUBLIC,
          },
        },
        testToken
      );

      const galleryId = createResponse.body.data.createGallery.id;

      // Fetch it without authentication
      const fetchResponse = await testApp.graphqlRequest(
        GALLERY_QUERIES.GET_GALLERY,
        { id: galleryId }
      );

      expect(fetchResponse.status).toBe(200);
      expect(fetchResponse.body.errors).toBeUndefined();
      expect(fetchResponse.body.data.gallery).toMatchObject({
        id: galleryId,
        name: 'Public Gallery',
        visibility: Visibility.PUBLIC,
      });
    });

    it('should return error for non-existent gallery', async () => {
      const response = await testApp.graphqlRequest(
        GALLERY_QUERIES.GET_GALLERY,
        { id: '12345678-1234-1234-1234-123456789012' }
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Gallery not found');
    });

    it('should block access to private galleries for non-owners', async () => {
      // Create a private gallery
      const createResponse = await testApp.authenticatedGraphqlRequest(
        GALLERY_QUERIES.CREATE_GALLERY,
        {
          input: {
            name: 'Private Gallery',
            visibility: Visibility.PRIVATE,
          },
        },
        testToken
      );

      const galleryId = createResponse.body.data.createGallery.id;

      // Try to fetch it without authentication
      const fetchResponse = await testApp.graphqlRequest(
        GALLERY_QUERIES.GET_GALLERY,
        { id: galleryId }
      );

      expect(fetchResponse.status).toBe(200);
      expect(fetchResponse.body.errors).toBeDefined();
      expect(fetchResponse.body.errors[0].message).toContain('Gallery is private');
    });
  });

  describe('galleries query', () => {
    beforeEach(async () => {
      // Create test galleries
      await testApp.authenticatedGraphqlRequest(
        GALLERY_QUERIES.CREATE_GALLERY,
        {
          input: {
            name: 'Public Gallery 1',
            visibility: Visibility.PUBLIC,
            sortOrder: 0,
          },
        },
        testToken
      );

      await testApp.authenticatedGraphqlRequest(
        GALLERY_QUERIES.CREATE_GALLERY,
        {
          input: {
            name: 'Private Gallery',
            visibility: Visibility.PRIVATE,
            sortOrder: 1,
          },
        },
        testToken
      );

      await testApp.authenticatedGraphqlRequest(
        GALLERY_QUERIES.CREATE_GALLERY,
        {
          input: {
            name: 'Public Gallery 2',
            visibility: Visibility.PUBLIC,
            sortOrder: 2,
          },
        },
        testToken
      );
    });

    it('should fetch paginated galleries', async () => {
      const response = await testApp.graphqlRequest(
        GALLERY_QUERIES.GET_GALLERIES,
        {
          filters: {
            limit: 10,
            offset: 0,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.galleries).toMatchObject({
        galleries: expect.any(Array),
        total: expect.any(Number),
        hasMore: expect.any(Boolean),
      });
    });

    it('should respect visibility controls', async () => {
      // Fetch all galleries without authentication
      const response = await testApp.graphqlRequest(
        GALLERY_QUERIES.GET_GALLERIES,
        {
          filters: {
            limit: 50,
            offset: 0,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      
      // Should not include private galleries in public query
      const privateGalleries = response.body.data.galleries.galleries.filter(
        (gallery: any) => gallery.visibility === Visibility.PRIVATE
      );
      
      expect(privateGalleries).toHaveLength(0);
      
      // Should include public galleries
      const publicGalleries = response.body.data.galleries.galleries.filter(
        (gallery: any) => gallery.visibility === Visibility.PUBLIC
      );
      
      expect(publicGalleries.length).toBe(2); // We created 2 public galleries
    });

    it('should return galleries in correct sort order', async () => {
      const response = await testApp.graphqlRequest(
        GALLERY_QUERIES.GET_GALLERIES,
        {
          filters: {
            limit: 10,
            offset: 0,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      
      const galleries = response.body.data.galleries.galleries;
      
      // Should be sorted by sortOrder first, then by createdAt desc
      expect(galleries[0].name).toBe('Public Gallery 1'); // sortOrder: 0
      expect(galleries[1].name).toBe('Public Gallery 2'); // sortOrder: 2
    });
  });

  describe('updateGallery', () => {
    it('should update gallery when user is owner', async () => {
      // Create a gallery
      const createResponse = await testApp.authenticatedGraphqlRequest(
        GALLERY_QUERIES.CREATE_GALLERY,
        {
          input: {
            name: 'Original Gallery',
            visibility: Visibility.PUBLIC,
          },
        },
        testToken
      );

      const galleryId = createResponse.body.data.createGallery.id;

      // Update it
      const updateResponse = await testApp.authenticatedGraphqlRequest(
        `
          mutation updateGallery($id: ID!, $input: UpdateGalleryInput!) {
            updateGallery(id: $id, input: $input) {
              id
              name
              description
            }
          }
        `,
        {
          id: galleryId,
          input: {
            name: 'Updated Gallery',
            description: 'Updated description',
          },
        },
        testToken
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.errors).toBeUndefined();
      expect(updateResponse.body.data.updateGallery).toMatchObject({
        id: galleryId,
        name: 'Updated Gallery',
        description: 'Updated description',
      });
    });
  });

  describe('deleteGallery', () => {
    it('should delete gallery when user is owner', async () => {
      // Create a gallery
      const createResponse = await testApp.authenticatedGraphqlRequest(
        GALLERY_QUERIES.CREATE_GALLERY,
        {
          input: {
            name: 'To Delete',
            visibility: Visibility.PUBLIC,
          },
        },
        testToken
      );

      const galleryId = createResponse.body.data.createGallery.id;

      // Delete it
      const deleteResponse = await testApp.authenticatedGraphqlRequest(
        `
          mutation deleteGallery($id: ID!) {
            deleteGallery(id: $id)
          }
        `,
        { id: galleryId },
        testToken
      );

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.errors).toBeUndefined();
      expect(deleteResponse.body.data.deleteGallery).toBe(true);

      // Verify it's deleted
      const fetchResponse = await testApp.graphqlRequest(
        GALLERY_QUERIES.GET_GALLERY,
        { id: galleryId }
      );

      expect(fetchResponse.body.errors).toBeDefined();
      expect(fetchResponse.body.errors[0].message).toContain('Gallery not found');
    });
  });

  describe('addImageToGallery', () => {
    it('should add image to gallery when user owns both', async () => {
      const db = testApp.getDb();

      // Create a gallery
      const galleryResponse = await testApp.authenticatedGraphqlRequest(
        GALLERY_QUERIES.CREATE_GALLERY,
        {
          input: {
            name: 'Test Gallery',
            visibility: Visibility.PUBLIC,
          },
        },
        testToken
      );

      const galleryId = galleryResponse.body.data.createGallery.id;

      // Create an image directly in the database (since we don't have file upload in GraphQL)
      const image = await db.image.create({
        data: {
          filename: 'test.jpg',
          originalFilename: 'test.jpg',
          url: 'data:image/jpeg;base64,test',
          thumbnailUrl: 'data:image/jpeg;base64,thumb',
          mimeType: 'image/jpeg',
          fileSize: 1000,
          width: 800,
          height: 600,
          uploaderId: testUserId,
        },
      });

      // Add image to gallery
      const addResponse = await testApp.authenticatedGraphqlRequest(
        `
          mutation addImageToGallery($galleryId: ID!, $input: GalleryImageOperationInput!) {
            addImageToGallery(galleryId: $galleryId, input: $input) {
              id
              name
              images {
                id
                originalFilename
              }
            }
          }
        `,
        {
          galleryId,
          input: { imageId: image.id },
        },
        testToken
      );

      expect(addResponse.status).toBe(200);
      expect(addResponse.body.errors).toBeUndefined();
      expect(addResponse.body.data.addImageToGallery.images).toHaveLength(1);
      expect(addResponse.body.data.addImageToGallery.images[0].id).toBe(image.id);
    });
  });

  describe('reorderGalleries', () => {
    it('should reorder galleries when user owns them', async () => {
      // Create multiple galleries
      const gallery1Response = await testApp.authenticatedGraphqlRequest(
        GALLERY_QUERIES.CREATE_GALLERY,
        {
          input: {
            name: 'Gallery 1',
            visibility: Visibility.PUBLIC,
            sortOrder: 0,
          },
        },
        testToken
      );

      const gallery2Response = await testApp.authenticatedGraphqlRequest(
        GALLERY_QUERIES.CREATE_GALLERY,
        {
          input: {
            name: 'Gallery 2',
            visibility: Visibility.PUBLIC,
            sortOrder: 1,
          },
        },
        testToken
      );

      const gallery1Id = gallery1Response.body.data.createGallery.id;
      const gallery2Id = gallery2Response.body.data.createGallery.id;

      // Reorder them (swap positions)
      const reorderResponse = await testApp.authenticatedGraphqlRequest(
        `
          mutation reorderGalleries($input: ReorderGalleriesInput!) {
            reorderGalleries(input: $input) {
              id
              name
              sortOrder
            }
          }
        `,
        {
          input: {
            galleryIds: [gallery2Id, gallery1Id], // Reverse order
          },
        },
        testToken
      );

      expect(reorderResponse.status).toBe(200);
      expect(reorderResponse.body.errors).toBeUndefined();
      
      const reorderedGalleries = reorderResponse.body.data.reorderGalleries;
      
      // Verify new sort orders
      const gallery1 = reorderedGalleries.find((g: any) => g.id === gallery1Id);
      const gallery2 = reorderedGalleries.find((g: any) => g.id === gallery2Id);
      
      expect(gallery2.sortOrder).toBe(0); // Now first
      expect(gallery1.sortOrder).toBe(1); // Now second
    });
  });
});