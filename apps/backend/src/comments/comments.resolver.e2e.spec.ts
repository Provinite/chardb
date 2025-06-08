import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { CommentsModule } from './comments.module';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseService } from '../database/database.service';
import { CommentableType } from './dto/comment.dto';

describe('CommentsResolver (e2e)', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;
  
  const testUser = {
    id: 'test-user-1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    displayName: 'Test User',
    isAdmin: false,
    isVerified: true,
    privacySettings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testCharacter = {
    id: 'test-character-1',
    name: 'Test Character',
    ownerId: testUser.id,
    visibility: 'PUBLIC',
    isSellable: false,
    isTradeable: false,
    tags: [],
    customFields: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
          context: ({ req }) => ({ req }),
        }),
        DatabaseModule,
        AuthModule,
        CommentsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    databaseService = moduleFixture.get<DatabaseService>(DatabaseService);
    await app.init();

    // Setup test data
    await databaseService.user.create({
      data: testUser,
    });

    await databaseService.character.create({
      data: testCharacter,
    });
  });

  afterEach(async () => {
    // Cleanup
    await databaseService.comment.deleteMany({});
    await databaseService.character.deleteMany({});
    await databaseService.user.deleteMany({});
    await app.close();
  });

  describe('createComment', () => {
    const createCommentMutation = `
      mutation CreateComment($input: CreateCommentInput!) {
        createComment(input: $input) {
          id
          content
          commentableType
          commentableId
          author {
            id
            username
          }
          repliesCount
        }
      }
    `;

    it('should create a comment on a character', async () => {
      const input = {
        content: 'This is a test comment',
        entityType: CommentableType.CHARACTER,
        entityId: testCharacter.id,
      };

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${generateTestJWT(testUser)}`)
        .send({
          query: createCommentMutation,
          variables: { input },
        })
        .expect(200);

      expect(response.body.data.createComment).toMatchObject({
        content: 'This is a test comment',
        commentableType: 'CHARACTER',
        commentableId: testCharacter.id,
        author: {
          id: testUser.id,
          username: testUser.username,
        },
        repliesCount: 0,
      });
    });

    it('should require authentication', async () => {
      const input = {
        content: 'This is a test comment',
        entityType: CommentableType.CHARACTER,
        entityId: testCharacter.id,
      };

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: createCommentMutation,
          variables: { input },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('should create a nested reply', async () => {
      // First create a parent comment
      const parentComment = await databaseService.comment.create({
        data: {
          content: 'Parent comment',
          authorId: testUser.id,
          commentableType: CommentableType.CHARACTER,
          commentableId: testCharacter.id,
        },
      });

      const input = {
        content: 'This is a reply',
        entityType: CommentableType.CHARACTER,
        entityId: testCharacter.id,
        parentId: parentComment.id,
      };

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${generateTestJWT(testUser)}`)
        .send({
          query: createCommentMutation,
          variables: { input },
        })
        .expect(200);

      expect(response.body.data.createComment).toMatchObject({
        content: 'This is a reply',
        commentableType: 'CHARACTER',
        commentableId: testCharacter.id,
      });
    });
  });

  describe('comments query', () => {
    const commentsQuery = `
      query Comments($filters: CommentFiltersInput!) {
        comments(filters: $filters) {
          comments {
            id
            content
            author {
              username
            }
            repliesCount
          }
          hasMore
          total
        }
      }
    `;

    it('should return comments for an entity', async () => {
      // Create test comments
      await databaseService.comment.createMany({
        data: [
          {
            content: 'First comment',
            authorId: testUser.id,
            commentableType: CommentableType.CHARACTER,
            commentableId: testCharacter.id,
          },
          {
            content: 'Second comment',
            authorId: testUser.id,
            commentableType: CommentableType.CHARACTER,
            commentableId: testCharacter.id,
          },
        ],
      });

      const filters = {
        entityType: CommentableType.CHARACTER,
        entityId: testCharacter.id,
        limit: 10,
        offset: 0,
      };

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: commentsQuery,
          variables: { filters },
        })
        .expect(200);

      expect(response.body.data.comments.comments).toHaveLength(2);
      expect(response.body.data.comments.total).toBe(2);
      expect(response.body.data.comments.hasMore).toBe(false);
    });
  });

  describe('updateComment', () => {
    const updateCommentMutation = `
      mutation UpdateComment($id: ID!, $input: UpdateCommentInput!) {
        updateComment(id: $id, input: $input) {
          id
          content
        }
      }
    `;

    it('should update own comment', async () => {
      const comment = await databaseService.comment.create({
        data: {
          content: 'Original content',
          authorId: testUser.id,
          commentableType: CommentableType.CHARACTER,
          commentableId: testCharacter.id,
        },
      });

      const input = { content: 'Updated content' };

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${generateTestJWT(testUser)}`)
        .send({
          query: updateCommentMutation,
          variables: { id: comment.id, input },
        })
        .expect(200);

      expect(response.body.data.updateComment).toMatchObject({
        id: comment.id,
        content: 'Updated content',
      });
    });
  });

  describe('deleteComment', () => {
    const deleteCommentMutation = `
      mutation DeleteComment($id: ID!) {
        deleteComment(id: $id)
      }
    `;

    it('should delete own comment', async () => {
      const comment = await databaseService.comment.create({
        data: {
          content: 'To be deleted',
          authorId: testUser.id,
          commentableType: CommentableType.CHARACTER,
          commentableId: testCharacter.id,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${generateTestJWT(testUser)}`)
        .send({
          query: deleteCommentMutation,
          variables: { id: comment.id },
        })
        .expect(200);

      expect(response.body.data.deleteComment).toBe(true);

      // Verify deletion
      const deletedComment = await databaseService.comment.findUnique({
        where: { id: comment.id },
      });
      expect(deletedComment).toBeNull();
    });
  });

  // Helper function to generate test JWT token
  function generateTestJWT(user: any): string {
    // In a real implementation, you'd use the JWT service
    // For testing, return a mock token that your test auth setup recognizes
    return `test-token-${user.id}`;
  }
});