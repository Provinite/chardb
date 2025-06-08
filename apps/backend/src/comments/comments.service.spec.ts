import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { DatabaseService } from '../database/database.service';
import { CommentableType } from './dto/comment.dto';

describe('CommentsService', () => {
  let service: CommentsService;
  let databaseService: jest.Mocked<DatabaseService>;

  const mockComment = {
    id: 'comment-1',
    content: 'Test comment',
    authorId: 'user-1',
    commentableType: CommentableType.CHARACTER,
    commentableId: 'character-1',
    parentId: null,
    isHidden: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
    },
    parent: null,
    replies: [],
    _count: { replies: 0 },
  };

  const mockCharacter = {
    id: 'character-1',
    name: 'Test Character',
    ownerId: 'user-1',
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      comment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      character: {
        findUnique: jest.fn(),
      },
      image: {
        findUnique: jest.fn(),
      },
      gallery: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    databaseService = module.get(DatabaseService);
  });

  describe('create', () => {
    it('should create a comment successfully', async () => {
      const input = {
        content: 'Test comment',
        entityType: CommentableType.CHARACTER,
        entityId: 'character-1',
      };

      databaseService.character.findUnique.mockResolvedValue(mockCharacter);
      databaseService.comment.create.mockResolvedValue(mockComment);

      const result = await service.create('user-1', input);

      expect(result.content).toBe('Test comment');
      expect(databaseService.character.findUnique).toHaveBeenCalledWith({
        where: { id: 'character-1' },
      });
      expect(databaseService.comment.create).toHaveBeenCalledWith({
        data: {
          content: 'Test comment',
          authorId: 'user-1',
          commentableType: CommentableType.CHARACTER,
          commentableId: 'character-1',
          parentId: undefined,
        },
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException when entity does not exist', async () => {
      const input = {
        content: 'Test comment',
        entityType: CommentableType.CHARACTER,
        entityId: 'non-existent',
      };

      databaseService.character.findUnique.mockResolvedValue(null);

      await expect(service.create('user-1', input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate parent comment belongs to same entity', async () => {
      const input = {
        content: 'Test reply',
        entityType: CommentableType.CHARACTER,
        entityId: 'character-1',
        parentId: 'parent-comment-1',
      };

      const parentComment = {
        ...mockComment,
        id: 'parent-comment-1',
        commentableType: CommentableType.IMAGE, // Different type
        commentableId: 'image-1', // Different entity
      };

      databaseService.character.findUnique.mockResolvedValue(mockCharacter);
      databaseService.comment.findUnique.mockResolvedValue(parentComment);

      await expect(service.create('user-1', input)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a comment', async () => {
      databaseService.comment.findUnique.mockResolvedValue(mockComment);

      const result = await service.findOne('comment-1');

      expect(result.id).toBe('comment-1');
      expect(databaseService.comment.findUnique).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when comment does not exist', async () => {
      databaseService.comment.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findMany', () => {
    it('should return comments with pagination', async () => {
      const filters = {
        entityType: CommentableType.CHARACTER,
        entityId: 'character-1',
        limit: 10,
        offset: 0,
      };

      databaseService.comment.findMany.mockResolvedValue([mockComment]);
      databaseService.comment.count.mockResolvedValue(1);

      const result = await service.findMany(filters);

      expect(result.comments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by parentId', async () => {
      const filters = {
        entityType: CommentableType.CHARACTER,
        entityId: 'character-1',
        parentId: null,
        limit: 10,
        offset: 0,
      };

      databaseService.comment.findMany.mockResolvedValue([]);
      databaseService.comment.count.mockResolvedValue(0);

      await service.findMany(filters);

      expect(databaseService.comment.findMany).toHaveBeenCalledWith({
        where: {
          commentableType: CommentableType.CHARACTER,
          commentableId: 'character-1',
          parentId: null,
          isHidden: false,
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      });
    });
  });

  describe('update', () => {
    it('should update a comment successfully', async () => {
      const input = { content: 'Updated content' };
      const updatedComment = { ...mockComment, content: 'Updated content' };

      databaseService.comment.findUnique.mockResolvedValue(mockComment);
      databaseService.comment.update.mockResolvedValue(updatedComment);

      const result = await service.update('comment-1', 'user-1', input);

      expect(result.content).toBe('Updated content');
      expect(databaseService.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { content: 'Updated content' },
        include: expect.any(Object),
      });
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      const input = { content: 'Updated content' };
      const otherUserComment = { ...mockComment, authorId: 'other-user' };

      databaseService.comment.findUnique.mockResolvedValue(otherUserComment);

      await expect(
        service.update('comment-1', 'user-1', input),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete a comment successfully', async () => {
      databaseService.comment.findUnique.mockResolvedValue(mockComment);
      databaseService.comment.delete.mockResolvedValue(mockComment);

      const result = await service.remove('comment-1', 'user-1');

      expect(result).toBe(true);
      expect(databaseService.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
      });
    });

    it('should allow admin to delete any comment', async () => {
      const otherUserComment = { ...mockComment, authorId: 'other-user' };
      databaseService.comment.findUnique.mockResolvedValue(otherUserComment);
      databaseService.comment.delete.mockResolvedValue(otherUserComment);

      const result = await service.remove('comment-1', 'admin-user', true);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when non-admin tries to delete others comment', async () => {
      const otherUserComment = { ...mockComment, authorId: 'other-user' };
      databaseService.comment.findUnique.mockResolvedValue(otherUserComment);

      await expect(
        service.remove('comment-1', 'user-1', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});