import { Test, TestingModule } from '@nestjs/testing';
import { CommentsResolver } from './comments.resolver';
import { CommentsService } from './comments.service';
import { DatabaseService } from '../database/database.service';
import { CommentableType } from './dto/comment.dto';
import { mockDatabaseService } from '../../test/setup';
import { AuthenticatedCurrentUserType } from '../auth/types/current-user.type';

describe('CommentsResolver', () => {
  let resolver: CommentsResolver;
  let service: CommentsService;
  let db: typeof mockDatabaseService;

  const mockUser: AuthenticatedCurrentUserType = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hash',
    displayName: null,
    bio: null,
    avatarUrl: null,
    location: null,
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

  const mockComment = {
    id: 'comment-1',
    content: 'Test comment',
    commentableType: CommentableType.CHARACTER,
    commentableId: 'character-1',
    authorId: 'user-1',
    parentId: null,
    isHidden: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: mockUser,
    parent: null,
    replies: [],
    repliesCount: 0,
    character: null,
    image: null,
    gallery: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsResolver,
        CommentsService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    resolver = module.get<CommentsResolver>(CommentsResolver);
    service = module.get<CommentsService>(CommentsService);
    db = module.get<DatabaseService>(DatabaseService) as any;
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const input = {
        content: 'Test comment',
        entityType: CommentableType.CHARACTER,
        entityId: 'character-1',
      };

      const mockCharacter = { id: 'character-1', name: 'Test Character' };
      db.character.findUnique.mockResolvedValue(mockCharacter);
      db.comment.create.mockResolvedValue({
        ...mockComment,
        content: input.content,
      });

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

      db.comment.findMany.mockResolvedValue([mockComment]);
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
      const updatedComment = { ...mockComment, content: 'Updated content' };

      db.comment.findUnique.mockResolvedValue(mockComment);
      db.comment.update.mockResolvedValue(updatedComment);

      const result = await resolver.updateComment('comment-1', input, mockUser);

      expect(result.content).toBe('Updated content');
    });
  });

  describe('deleteComment', () => {
    it('should delete own comment', async () => {
      db.comment.findUnique.mockResolvedValue(mockComment);
      db.comment.delete.mockResolvedValue(mockComment);

      const result = await resolver.deleteComment('comment-1', mockUser);

      expect(result).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a comment by id', async () => {
      db.comment.findUnique.mockResolvedValue(mockComment);

      const result = await resolver.comment('comment-1');

      expect(result.id).toBe('comment-1');
      expect(result.content).toBe('Test comment');
    });
  });
});