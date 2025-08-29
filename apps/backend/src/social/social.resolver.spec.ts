import { Test, TestingModule } from '@nestjs/testing';
import { SocialService } from './social.service';
import { 
  SocialResolver,
  CharacterLikesResolver,
  ImageLikesResolver,
  GalleryLikesResolver,
  CommentLikesResolver,
  UserFollowResolver,
} from './social.resolver';
import { DatabaseService } from '../database/database.service';
import { LikeableType } from './dto/like.dto';
import { mockDatabaseService } from '../../test/setup';

describe('SocialResolver', () => {
  let resolver: SocialResolver;
  let service: SocialService;
  let db: typeof mockDatabaseService;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    isAdmin: false,
    isVerified: true,
    privacySettings: {},
    canCreateCommunity: false,
    canListUsers: false,
    canListInviteCodes: false,
    canCreateInviteCode: false,
    canGrantGlobalPermissions: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    followersCount: 0,
    followingCount: 0,
    userIsFollowing: false,
  };

  const mockLikeResult = {
    isLiked: true,
    likesCount: 1,
    entityType: LikeableType.CHARACTER,
    entityId: 'character-1',
  };

  const mockLikeStatus = {
    isLiked: true,
    likesCount: 5,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialResolver,
        SocialService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    resolver = module.get<SocialResolver>(SocialResolver);
    service = module.get<SocialService>(SocialService);
    db = module.get<DatabaseService>(DatabaseService) as any;
  });

  describe('toggleLike', () => {
    it('should toggle a like successfully', async () => {
      const input = {
        entityType: LikeableType.CHARACTER,
        entityId: 'character-1',
      };

      jest.spyOn(service, 'toggleLike').mockResolvedValue(mockLikeResult);

      const result = await resolver.toggleLike(input, mockUser);

      expect(result).toEqual(mockLikeResult);
      expect(service.toggleLike).toHaveBeenCalledWith('user-1', input);
    });
  });

  describe('likeStatus', () => {
    it('should return like status for authenticated user', async () => {
      jest.spyOn(service, 'getLikeStatus').mockResolvedValue(mockLikeStatus);

      const result = await resolver.likeStatus(
        LikeableType.CHARACTER,
        'character-1',
        mockUser,
      );

      expect(result).toEqual(mockLikeStatus);
      expect(service.getLikeStatus).toHaveBeenCalledWith(
        LikeableType.CHARACTER,
        'character-1',
        'user-1',
      );
    });

    it('should return like status for unauthenticated user', async () => {
      const unauthStatus = { isLiked: false, likesCount: 5 };
      jest.spyOn(service, 'getLikeStatus').mockResolvedValue(unauthStatus);

      const result = await resolver.likeStatus(
        LikeableType.CHARACTER,
        'character-1',
      );

      expect(result).toEqual(unauthStatus);
      expect(service.getLikeStatus).toHaveBeenCalledWith(
        LikeableType.CHARACTER,
        'character-1',
        undefined,
      );
    });
  });
});

describe('CharacterLikesResolver', () => {
  let resolver: CharacterLikesResolver;
  let service: SocialService;

  const mockCharacter = {
    id: 'character-1',
    name: 'Test Character',
    ownerId: 'user-1',
    visibility: 'PUBLIC' as any,
    isSellable: false,
    isTradeable: false,
    tags: [],
    traitValues: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      isAdmin: false,
      isVerified: true,
      privacySettings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      followersCount: 0,
      followingCount: 0,
      userIsFollowing: false,
    },
    likesCount: 0,
    userHasLiked: false,
  };

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CharacterLikesResolver,
        SocialService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    resolver = module.get<CharacterLikesResolver>(CharacterLikesResolver);
    service = module.get<SocialService>(SocialService);
  });

  describe('likesCount', () => {
    it('should return the likes count for a character', async () => {
      jest.spyOn(service, 'getLikesCount').mockResolvedValue(10);

      const result = await resolver.likesCount(mockCharacter);

      expect(result).toBe(10);
      expect(service.getLikesCount).toHaveBeenCalledWith(
        LikeableType.CHARACTER,
        'character-1',
      );
    });
  });

  describe('userHasLiked', () => {
    it('should return true when user has liked the character', async () => {
      jest.spyOn(service, 'getUserHasLiked').mockResolvedValue(true);

      const result = await resolver.userHasLiked(mockCharacter, mockUser);

      expect(result).toBe(true);
      expect(service.getUserHasLiked).toHaveBeenCalledWith(
        LikeableType.CHARACTER,
        'character-1',
        'user-1',
      );
    });

    it('should return false when no user is authenticated', async () => {
      jest.spyOn(service, 'getUserHasLiked').mockResolvedValue(false);

      const result = await resolver.userHasLiked(mockCharacter);

      expect(result).toBe(false);
      expect(service.getUserHasLiked).toHaveBeenCalledWith(
        LikeableType.CHARACTER,
        'character-1',
        undefined,
      );
    });
  });
});

describe('ImageLikesResolver', () => {
  let resolver: ImageLikesResolver;
  let service: SocialService;

  const mockImage = {
    id: 'image-1',
    filename: 'test.jpg',
    originalFilename: 'test.jpg',
    url: 'http://example.com/test.jpg',
    uploaderId: 'user-1',
    width: 100,
    height: 100,
    fileSize: 1000,
    mimeType: 'image/jpeg',
    isNsfw: false,
    visibility: 'PUBLIC' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    uploader: {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      isAdmin: false,
      isVerified: true,
      privacySettings: {},
      canCreateCommunity: false,
      canListUsers: false,
      canListInviteCodes: false,
      canCreateInviteCode: false,
      canGrantGlobalPermissions: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      followersCount: 0,
      followingCount: 0,
      userIsFollowing: false,
    },
    likesCount: 0,
    userHasLiked: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageLikesResolver,
        SocialService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    resolver = module.get<ImageLikesResolver>(ImageLikesResolver);
    service = module.get<SocialService>(SocialService);
  });

  describe('likesCount', () => {
    it('should return the likes count for an image', async () => {
      jest.spyOn(service, 'getLikesCount').mockResolvedValue(7);

      const result = await resolver.likesCount(mockImage);

      expect(result).toBe(7);
      expect(service.getLikesCount).toHaveBeenCalledWith(
        LikeableType.IMAGE,
        'image-1',
      );
    });
  });
});

describe('GalleryLikesResolver', () => {
  let resolver: GalleryLikesResolver;
  let service: SocialService;

  const mockGallery = {
    id: 'gallery-1',
    name: 'Test Gallery',
    ownerId: 'user-1',
    visibility: 'PUBLIC' as any,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      isAdmin: false,
      isVerified: true,
      privacySettings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      followersCount: 0,
      followingCount: 0,
      userIsFollowing: false,
    },
    images: [],
    likesCount: 0,
    userHasLiked: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GalleryLikesResolver,
        SocialService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    resolver = module.get<GalleryLikesResolver>(GalleryLikesResolver);
    service = module.get<SocialService>(SocialService);
  });

  describe('likesCount', () => {
    it('should return the likes count for a gallery', async () => {
      jest.spyOn(service, 'getLikesCount').mockResolvedValue(3);

      const result = await resolver.likesCount(mockGallery);

      expect(result).toBe(3);
      expect(service.getLikesCount).toHaveBeenCalledWith(
        LikeableType.GALLERY,
        'gallery-1',
      );
    });
  });
});

describe('CommentLikesResolver', () => {
  let resolver: CommentLikesResolver;
  let service: SocialService;

  const mockComment = {
    id: 'comment-1',
    content: 'Test comment',
    commentableType: 'CHARACTER' as any,
    commentableId: 'character-1',
    authorId: 'user-1',
    isHidden: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      isAdmin: false,
      isVerified: true,
      privacySettings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      followersCount: 0,
      followingCount: 0,
      userIsFollowing: false,
    },
    replies: [],
    repliesCount: 0,
    likesCount: 0,
    userHasLiked: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentLikesResolver,
        SocialService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    resolver = module.get<CommentLikesResolver>(CommentLikesResolver);
    service = module.get<SocialService>(SocialService);
  });

  describe('likesCount', () => {
    it('should return the likes count for a comment', async () => {
      jest.spyOn(service, 'getLikesCount').mockResolvedValue(15);

      const result = await resolver.likesCount(mockComment);

      expect(result).toBe(15);
      expect(service.getLikesCount).toHaveBeenCalledWith(
        LikeableType.COMMENT,
        'comment-1',
      );
    });
  });
});

// Follow System Tests

describe('SocialResolver - Follow System', () => {
  let resolver: SocialResolver;
  let service: SocialService;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    isAdmin: false,
    isVerified: true,
    privacySettings: {},
    canCreateCommunity: false,
    canListUsers: false,
    canListInviteCodes: false,
    canCreateInviteCode: false,
    canGrantGlobalPermissions: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    followersCount: 0,
    followingCount: 0,
    userIsFollowing: false,
  };

  const mockFollowResult = {
    isFollowing: true,
    followersCount: 1,
    followingCount: 1,
    targetUserId: 'user-2',
  };

  const mockFollowStatus = {
    isFollowing: true,
    followersCount: 5,
    followingCount: 3,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialResolver,
        SocialService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    resolver = module.get<SocialResolver>(SocialResolver);
    service = module.get<SocialService>(SocialService);
  });

  describe('toggleFollow', () => {
    it('should toggle a follow successfully', async () => {
      const input = { targetUserId: 'user-2' };

      jest.spyOn(service, 'toggleFollow').mockResolvedValue(mockFollowResult);

      const result = await resolver.toggleFollow(input, mockUser);

      expect(result).toEqual(mockFollowResult);
      expect(service.toggleFollow).toHaveBeenCalledWith('user-1', input);
    });
  });

  describe('followStatus', () => {
    it('should return follow status for authenticated user', async () => {
      jest.spyOn(service, 'getFollowStatus').mockResolvedValue(mockFollowStatus);

      const result = await resolver.followStatus('user-2', mockUser);

      expect(result).toEqual(mockFollowStatus);
      expect(service.getFollowStatus).toHaveBeenCalledWith('user-2', 'user-1');
    });

    it('should return follow status for unauthenticated user', async () => {
      const unauthStatus = { isFollowing: false, followersCount: 5, followingCount: 3 };
      jest.spyOn(service, 'getFollowStatus').mockResolvedValue(unauthStatus);

      const result = await resolver.followStatus('user-2');

      expect(result).toEqual(unauthStatus);
      expect(service.getFollowStatus).toHaveBeenCalledWith('user-2', undefined);
    });
  });
});

describe('UserFollowResolver', () => {
  let resolver: UserFollowResolver;
  let service: SocialService;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    isAdmin: false,
    isVerified: true,
    privacySettings: {},
    canCreateCommunity: false,
    canListUsers: false,
    canListInviteCodes: false,
    canCreateInviteCode: false,
    canGrantGlobalPermissions: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    followersCount: 0,
    followingCount: 0,
    userIsFollowing: false,
  };

  const mockCurrentUser = {
    id: 'user-2',
    username: 'currentuser',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserFollowResolver,
        SocialService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    resolver = module.get<UserFollowResolver>(UserFollowResolver);
    service = module.get<SocialService>(SocialService);
  });

  describe('followersCount', () => {
    it('should return the followers count for a user', async () => {
      jest.spyOn(service, 'getFollowersCount').mockResolvedValue(25);

      const result = await resolver.followersCount(mockUser);

      expect(result).toBe(25);
      expect(service.getFollowersCount).toHaveBeenCalledWith('user-1');
    });
  });

  describe('followingCount', () => {
    it('should return the following count for a user', async () => {
      jest.spyOn(service, 'getFollowingCount').mockResolvedValue(12);

      const result = await resolver.followingCount(mockUser);

      expect(result).toBe(12);
      expect(service.getFollowingCount).toHaveBeenCalledWith('user-1');
    });
  });

  describe('userIsFollowing', () => {
    it('should return true when current user is following the target user', async () => {
      jest.spyOn(service, 'getUserIsFollowing').mockResolvedValue(true);

      const result = await resolver.userIsFollowing(mockUser, mockCurrentUser);

      expect(result).toBe(true);
      expect(service.getUserIsFollowing).toHaveBeenCalledWith('user-1', 'user-2');
    });

    it('should return false when no current user is authenticated', async () => {
      jest.spyOn(service, 'getUserIsFollowing').mockResolvedValue(false);

      const result = await resolver.userIsFollowing(mockUser);

      expect(result).toBe(false);
      expect(service.getUserIsFollowing).toHaveBeenCalledWith('user-1', undefined);
    });
  });
});