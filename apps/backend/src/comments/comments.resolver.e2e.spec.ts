import { Test, TestingModule } from '@nestjs/testing';
import { CommentsResolver } from './comments.resolver';
import { CommentsService } from './comments.service';
import { UsersService } from '../users/users.service';
import { CharactersService } from '../characters/characters.service';
import { ImagesService } from '../images/images.service';
import { GalleriesService } from '../galleries/galleries.service';
import { DatabaseService } from '../database/database.service';
import { CommentableType } from './dto/comment.dto';
import { mockDatabaseService } from '../../test/setup';
import { AuthenticatedCurrentUserType } from '../auth/types/current-user.type';

const mockUsersService = { findOne: jest.fn() };
const mockCharactersService = { findOne: jest.fn() };
const mockImagesService = { findOne: jest.fn() };
const mockGalleriesService = { findOne: jest.fn() };

describe('CommentsResolver', () => {
  let resolver: CommentsResolver;
  let db: typeof mockDatabaseService;

  const mockUser: AuthenticatedCurrentUserType = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hash',
    displayName: null,
    bio: null,
    avatarImageId: null,
    website: null,
    dateOfBirth: null,
    isVerified: false,
    isAdmin: false,
    privacySettings: {},
    canCreateCommunity: false,
    canListUsers: false,
    canListInviteCodes: false,
    canCreateInviteCode: false,
    canGrantGlobalPermissions: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock comment using DB schema fields (direct FKs, not polymorphic commentableType/Id)
  const mockDbComment = {
    id: 'comment-1',
    content: 'Test comment',
    characterId: 'character-1',
    imageId: null,
    galleryId: null,
    userId: null,
    authorId: 'user-1',
    parentId: null,
    isHidden: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsResolver,
        CommentsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: CharactersService, useValue: mockCharactersService },
        { provide: ImagesService, useValue: mockImagesService },
        { provide: GalleriesService, useValue: mockGalleriesService },
      ],
    }).compile();

    resolver = module.get<CommentsResolver>(CommentsResolver);
    db = module.get<DatabaseService>(DatabaseService) as unknown as typeof mockDatabaseService;
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const input = {
        content: 'Test comment',
        entityType: CommentableType.CHARACTER,
        entityId: 'character-1',
      };

      db.character.findUnique.mockResolvedValue({ id: 'character-1', name: 'Test Character' });
      db.comment.create.mockResolvedValue(mockDbComment);

      const result = await resolver.createComment(input, mockUser);

      expect(result.content).toBe('Test comment');
      expect(result.commentableType).toBe(CommentableType.CHARACTER);
      expect(result.commentableId).toBe('character-1');
    });
  });

  describe('comments query', () => {
    it('should return comments for an entity', async () => {
      const filters = {
        entityType: CommentableType.CHARACTER,
        entityId: 'character-1',
        limit: 10,
        offset: 0,
      };

      db.comment.findMany.mockResolvedValue([mockDbComment]);
      db.comment.count.mockResolvedValue(1);

      const result = await resolver.comments(filters);

      expect(result.comments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('updateComment', () => {
    it('should update own comment', async () => {
      const input = { content: 'Updated content' };
      const updatedComment = { ...mockDbComment, content: 'Updated content' };

      db.comment.findUnique.mockResolvedValue(mockDbComment);
      db.comment.update.mockResolvedValue(updatedComment);

      const result = await resolver.updateComment('comment-1', input, mockUser);

      expect(result.content).toBe('Updated content');
    });
  });

  describe('deleteComment', () => {
    it('should delete own comment', async () => {
      db.comment.findUnique.mockResolvedValue(mockDbComment);
      db.comment.delete.mockResolvedValue(mockDbComment);

      const result = await resolver.deleteComment('comment-1', mockUser);

      expect(result).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a comment by id', async () => {
      db.comment.findUnique.mockResolvedValue(mockDbComment);

      const result = await resolver.comment('comment-1');

      expect(result.id).toBe('comment-1');
      expect(result.content).toBe('Test comment');
    });
  });
});
