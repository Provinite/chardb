import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SocialService } from './social.service';
import { DatabaseService } from '../database/database.service';
import { LikeableType } from './dto/like.dto';
import { mockDatabaseService } from '../../test/setup';

describe('SocialService', () => {
  let service: SocialService;
  let db: typeof mockDatabaseService;

  const mockCharacter = {
    id: 'character-1',
    name: 'Test Character',
    ownerId: 'user-1',
  };

  const mockLike = {
    id: 'like-1',
    userId: 'user-1',
    likeableType: LikeableType.CHARACTER,
    likeableId: 'character-1',
    createdAt: new Date(),
    user: {
      id: 'user-1',
      username: 'testuser',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<SocialService>(SocialService);
    db = module.get<DatabaseService>(DatabaseService) as any;
  });

  describe('toggleLike', () => {
    it('should create a like when user has not liked the entity', async () => {
      const input = {
        entityType: LikeableType.CHARACTER,
        entityId: 'character-1',
      };

      // Mock entity exists
      db.character.findUnique.mockResolvedValue(mockCharacter);
      
      // Mock no existing like
      db.like.findUnique.mockResolvedValue(null);
      
      // Mock transaction
      db.$transaction.mockImplementation(async (callback) => {
        db.like.findUnique.mockResolvedValue(null);
        db.like.create.mockResolvedValue(mockLike);
        db.like.count.mockResolvedValue(1);
        return callback(db);
      });

      const result = await service.toggleLike('user-1', input);

      expect(result).toEqual({
        isLiked: true,
        likesCount: 1,
        entityType: LikeableType.CHARACTER,
        entityId: 'character-1',
      });
    });

    it('should remove a like when user has already liked the entity', async () => {
      const input = {
        entityType: LikeableType.CHARACTER,
        entityId: 'character-1',
      };

      // Mock entity exists
      db.character.findUnique.mockResolvedValue(mockCharacter);
      
      // Mock transaction with existing like
      db.$transaction.mockImplementation(async (callback) => {
        db.like.findUnique.mockResolvedValue(mockLike);
        db.like.delete.mockResolvedValue(mockLike);
        db.like.count.mockResolvedValue(0);
        return callback(db);
      });

      const result = await service.toggleLike('user-1', input);

      expect(result).toEqual({
        isLiked: false,
        likesCount: 0,
        entityType: LikeableType.CHARACTER,
        entityId: 'character-1',
      });
    });

    it('should throw BadRequestException when entity does not exist', async () => {
      const input = {
        entityType: LikeableType.CHARACTER,
        entityId: 'non-existent',
      };

      db.character.findUnique.mockResolvedValue(null);

      await expect(service.toggleLike('user-1', input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate all entity types', async () => {
      const testCases = [
        { type: LikeableType.CHARACTER, mock: 'character' },
        { type: LikeableType.IMAGE, mock: 'image' },
        { type: LikeableType.GALLERY, mock: 'gallery' },
        { type: LikeableType.COMMENT, mock: 'comment' },
      ];

      for (const testCase of testCases) {
        const input = {
          entityType: testCase.type,
          entityId: 'test-id',
        };

        db[testCase.mock].findUnique.mockResolvedValue({ id: 'test-id' });
        db.$transaction.mockImplementation(async (callback) => {
          db.like.findUnique.mockResolvedValue(null);
          db.like.create.mockResolvedValue(mockLike);
          db.like.count.mockResolvedValue(1);
          return callback(db);
        });

        const result = await service.toggleLike('user-1', input);
        expect(result.isLiked).toBe(true);
      }
    });
  });

  describe('getLikeStatus', () => {
    it('should return like status for authenticated user', async () => {
      db.like.count.mockResolvedValue(5);
      db.like.findUnique.mockResolvedValue(mockLike);

      const result = await service.getLikeStatus(
        LikeableType.CHARACTER,
        'character-1',
        'user-1',
      );

      expect(result).toEqual({
        isLiked: true,
        likesCount: 5,
      });
    });

    it('should return like status for unauthenticated user', async () => {
      db.like.count.mockResolvedValue(5);

      const result = await service.getLikeStatus(
        LikeableType.CHARACTER,
        'character-1',
      );

      expect(result).toEqual({
        isLiked: false,
        likesCount: 5,
      });
    });

    it('should return false when user has not liked the entity', async () => {
      db.like.count.mockResolvedValue(3);
      db.like.findUnique.mockResolvedValue(null);

      const result = await service.getLikeStatus(
        LikeableType.CHARACTER,
        'character-1',
        'user-1',
      );

      expect(result).toEqual({
        isLiked: false,
        likesCount: 3,
      });
    });
  });

  describe('getLikesCount', () => {
    it('should return the correct likes count', async () => {
      db.like.count.mockResolvedValue(10);

      const result = await service.getLikesCount(
        LikeableType.CHARACTER,
        'character-1',
      );

      expect(result).toBe(10);
      expect(db.like.count).toHaveBeenCalledWith({
        where: {
          likeableType: LikeableType.CHARACTER,
          likeableId: 'character-1',
        },
      });
    });
  });

  describe('getUserHasLiked', () => {
    it('should return true when user has liked the entity', async () => {
      db.like.findUnique.mockResolvedValue(mockLike);

      const result = await service.getUserHasLiked(
        LikeableType.CHARACTER,
        'character-1',
        'user-1',
      );

      expect(result).toBe(true);
    });

    it('should return false when user has not liked the entity', async () => {
      db.like.findUnique.mockResolvedValue(null);

      const result = await service.getUserHasLiked(
        LikeableType.CHARACTER,
        'character-1',
        'user-1',
      );

      expect(result).toBe(false);
    });

    it('should return false when no user is provided', async () => {
      const result = await service.getUserHasLiked(
        LikeableType.CHARACTER,
        'character-1',
      );

      expect(result).toBe(false);
      expect(db.like.findUnique).not.toHaveBeenCalled();
    });
  });
});