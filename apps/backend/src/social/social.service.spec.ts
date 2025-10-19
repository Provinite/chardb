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

        (db as any)[testCase.mock].findUnique.mockResolvedValue({
          id: 'test-id',
        });
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

  // Follow System Tests

  describe('toggleFollow', () => {
    const mockUser = {
      id: 'user-2',
      username: 'targetuser',
      email: 'target@example.com',
    };

    const mockFollow = {
      id: 'follow-1',
      followerId: 'user-1',
      followingId: 'user-2',
      createdAt: new Date(),
    };

    it('should create a follow when user has not followed the target', async () => {
      const input = { targetUserId: 'user-2' };

      // Mock target user exists
      db.user.findUnique.mockResolvedValue(mockUser);

      // Mock transaction
      db.$transaction.mockImplementation(async (callback) => {
        const txDb = {
          ...db,
          follow: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockFollow),
            count: jest
              .fn()
              .mockResolvedValueOnce(1) // followers count
              .mockResolvedValueOnce(1), // following count
          },
        };
        return callback(txDb);
      });

      const result = await service.toggleFollow('user-1', input);

      expect(result).toEqual({
        isFollowing: true,
        followersCount: 1,
        followingCount: 1,
        targetUserId: 'user-2',
      });
    });

    it('should remove a follow when user has already followed the target', async () => {
      const input = { targetUserId: 'user-2' };

      // Mock target user exists
      db.user.findUnique.mockResolvedValue(mockUser);

      // Mock transaction with existing follow
      db.$transaction.mockImplementation(async (callback) => {
        const txDb = {
          ...db,
          follow: {
            findUnique: jest.fn().mockResolvedValue(mockFollow),
            delete: jest.fn().mockResolvedValue(mockFollow),
            count: jest
              .fn()
              .mockResolvedValueOnce(0) // followers count
              .mockResolvedValueOnce(0), // following count
          },
        };
        return callback(txDb);
      });

      const result = await service.toggleFollow('user-1', input);

      expect(result).toEqual({
        isFollowing: false,
        followersCount: 0,
        followingCount: 0,
        targetUserId: 'user-2',
      });
    });

    it('should throw BadRequestException when target user does not exist', async () => {
      const input = { targetUserId: 'non-existent' };

      db.user.findUnique.mockResolvedValue(null);

      await expect(service.toggleFollow('user-1', input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when user tries to follow themselves', async () => {
      const input = { targetUserId: 'user-1' };

      await expect(service.toggleFollow('user-1', input)).rejects.toThrow(
        'Users cannot follow themselves',
      );
    });
  });

  describe('getFollowStatus', () => {
    it('should return follow status for authenticated user', async () => {
      const mockFollow = {
        id: 'follow-1',
        followerId: 'user-1',
        followingId: 'user-2',
        createdAt: new Date(),
      };

      db.follow.count.mockResolvedValueOnce(10); // followers count
      db.follow.count.mockResolvedValueOnce(5); // following count
      db.follow.findUnique.mockResolvedValue(mockFollow);

      const result = await service.getFollowStatus('user-2', 'user-1');

      expect(result).toEqual({
        isFollowing: true,
        followersCount: 10,
        followingCount: 5,
      });
    });

    it('should return follow status for unauthenticated user', async () => {
      db.follow.count.mockResolvedValueOnce(10); // followers count
      db.follow.count.mockResolvedValueOnce(5); // following count

      const result = await service.getFollowStatus('user-2');

      expect(result).toEqual({
        isFollowing: false,
        followersCount: 10,
        followingCount: 5,
      });
    });

    it('should return false when current user is the same as target user', async () => {
      db.follow.count.mockResolvedValueOnce(10); // followers count
      db.follow.count.mockResolvedValueOnce(5); // following count

      const result = await service.getFollowStatus('user-1', 'user-1');

      expect(result).toEqual({
        isFollowing: false,
        followersCount: 10,
        followingCount: 5,
      });
    });
  });

  describe('getFollowersCount', () => {
    it('should return the correct followers count', async () => {
      db.follow.count.mockResolvedValue(15);

      const result = await service.getFollowersCount('user-1');

      expect(result).toBe(15);
      expect(db.follow.count).toHaveBeenCalledWith({
        where: { followingId: 'user-1' },
      });
    });
  });

  describe('getFollowingCount', () => {
    it('should return the correct following count', async () => {
      db.follow.count.mockResolvedValue(8);

      const result = await service.getFollowingCount('user-1');

      expect(result).toBe(8);
      expect(db.follow.count).toHaveBeenCalledWith({
        where: { followerId: 'user-1' },
      });
    });
  });

  describe('getUserIsFollowing', () => {
    it('should return true when user is following the target', async () => {
      const mockFollow = {
        id: 'follow-1',
        followerId: 'user-1',
        followingId: 'user-2',
        createdAt: new Date(),
      };

      db.follow.findUnique.mockResolvedValue(mockFollow);

      const result = await service.getUserIsFollowing('user-2', 'user-1');

      expect(result).toBe(true);
    });

    it('should return false when user is not following the target', async () => {
      db.follow.findUnique.mockResolvedValue(null);

      const result = await service.getUserIsFollowing('user-2', 'user-1');

      expect(result).toBe(false);
    });

    it('should return false when no current user is provided', async () => {
      const result = await service.getUserIsFollowing('user-2');

      expect(result).toBe(false);
      expect(db.follow.findUnique).not.toHaveBeenCalled();
    });

    it('should return false when current user is the same as target user', async () => {
      const result = await service.getUserIsFollowing('user-1', 'user-1');

      expect(result).toBe(false);
      expect(db.follow.findUnique).not.toHaveBeenCalled();
    });
  });
});
