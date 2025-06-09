import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { LikeableType, ToggleLikeInput, LikeResult, LikeStatus } from './dto/like.dto';
import { ToggleFollowInput, FollowResult, FollowStatus } from './dto/follow.dto';

@Injectable()
export class SocialService {
  constructor(private readonly databaseService: DatabaseService) {}

  async toggleLike(userId: string, input: ToggleLikeInput): Promise<LikeResult> {
    // Validate that the entity exists
    await this.validateEntity(input.entityType, input.entityId);

    // Use transaction for atomicity
    const result = await this.databaseService.$transaction(async (tx) => {
      const existingLike = await tx.like.findUnique({
        where: {
          userId_likeableType_likeableId: {
            userId,
            likeableType: input.entityType,
            likeableId: input.entityId,
          },
        },
      });

      let isLiked: boolean;

      if (existingLike) {
        // Unlike - remove the like
        await tx.like.delete({
          where: { id: existingLike.id },
        });
        isLiked = false;
      } else {
        // Like - create new like
        await tx.like.create({
          data: {
            userId,
            likeableType: input.entityType,
            likeableId: input.entityId,
          },
        });
        isLiked = true;
      }

      // Get updated count
      const likesCount = await tx.like.count({
        where: {
          likeableType: input.entityType,
          likeableId: input.entityId,
        },
      });

      return {
        isLiked,
        likesCount,
        entityType: input.entityType,
        entityId: input.entityId,
      };
    });

    return result;
  }

  async getLikeStatus(
    entityType: LikeableType,
    entityId: string,
    userId?: string,
  ): Promise<LikeStatus> {
    // Get likes count
    const likesCount = await this.databaseService.like.count({
      where: {
        likeableType: entityType,
        likeableId: entityId,
      },
    });

    // Check if user has liked (if user is provided)
    let isLiked = false;
    if (userId) {
      const userLike = await this.databaseService.like.findUnique({
        where: {
          userId_likeableType_likeableId: {
            userId,
            likeableType: entityType,
            likeableId: entityId,
          },
        },
      });
      isLiked = !!userLike;
    }

    return {
      isLiked,
      likesCount,
    };
  }

  async getLikesCount(entityType: LikeableType, entityId: string): Promise<number> {
    return this.databaseService.like.count({
      where: {
        likeableType: entityType,
        likeableId: entityId,
      },
    });
  }

  async getUserHasLiked(
    entityType: LikeableType,
    entityId: string,
    userId?: string,
  ): Promise<boolean> {
    if (!userId) {
      return false;
    }

    const userLike = await this.databaseService.like.findUnique({
      where: {
        userId_likeableType_likeableId: {
          userId,
          likeableType: entityType,
          likeableId: entityId,
        },
      },
    });

    return !!userLike;
  }

  private async validateEntity(entityType: LikeableType, entityId: string): Promise<void> {
    let exists = false;

    switch (entityType) {
      case LikeableType.CHARACTER:
        const character = await this.databaseService.character.findUnique({
          where: { id: entityId },
        });
        exists = !!character;
        break;
      case LikeableType.IMAGE:
        const image = await this.databaseService.image.findUnique({
          where: { id: entityId },
        });
        exists = !!image;
        break;
      case LikeableType.GALLERY:
        const gallery = await this.databaseService.gallery.findUnique({
          where: { id: entityId },
        });
        exists = !!gallery;
        break;
      case LikeableType.COMMENT:
        const comment = await this.databaseService.comment.findUnique({
          where: { id: entityId },
        });
        exists = !!comment;
        break;
    }

    if (!exists) {
      throw new BadRequestException(`${entityType.toLowerCase()} not found`);
    }
  }

  // Follow System Methods

  async toggleFollow(userId: string, input: ToggleFollowInput): Promise<FollowResult> {
    const { targetUserId } = input;

    // Prevent self-following
    if (userId === targetUserId) {
      throw new BadRequestException('Users cannot follow themselves');
    }

    // Validate that the target user exists
    await this.validateUser(targetUserId);

    // Use transaction for atomicity
    const result = await this.databaseService.$transaction(async (tx) => {
      const existingFollow = await tx.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          },
        },
      });

      let isFollowing: boolean;

      if (existingFollow) {
        // Unfollow - remove the follow
        await tx.follow.delete({
          where: { id: existingFollow.id },
        });
        isFollowing = false;
      } else {
        // Follow - create new follow
        await tx.follow.create({
          data: {
            followerId: userId,
            followingId: targetUserId,
          },
        });
        isFollowing = true;
      }

      // Get updated counts
      const followersCount = await tx.follow.count({
        where: { followingId: targetUserId },
      });

      const followingCount = await tx.follow.count({
        where: { followerId: userId },
      });

      return {
        isFollowing,
        followersCount,
        followingCount,
        targetUserId,
      };
    });

    return result;
  }

  async getFollowStatus(
    userId: string,
    currentUserId?: string,
  ): Promise<FollowStatus> {
    // Get follower/following counts
    const followersCount = await this.databaseService.follow.count({
      where: { followingId: userId },
    });

    const followingCount = await this.databaseService.follow.count({
      where: { followerId: userId },
    });

    // Check if current user is following (if current user is provided)
    let isFollowing = false;
    if (currentUserId && currentUserId !== userId) {
      const userFollow = await this.databaseService.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: userId,
          },
        },
      });
      isFollowing = !!userFollow;
    }

    return {
      isFollowing,
      followersCount,
      followingCount,
    };
  }

  async getFollowersCount(userId: string): Promise<number> {
    return this.databaseService.follow.count({
      where: { followingId: userId },
    });
  }

  async getFollowingCount(userId: string): Promise<number> {
    return this.databaseService.follow.count({
      where: { followerId: userId },
    });
  }

  async getUserIsFollowing(
    userId: string,
    currentUserId?: string,
  ): Promise<boolean> {
    if (!currentUserId || currentUserId === userId) {
      return false;
    }

    const userFollow = await this.databaseService.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: userId,
        },
      },
    });

    return !!userFollow;
  }

  private async validateUser(userId: string): Promise<void> {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }
  }

  // Methods to get user's liked content
  async getUserLikedCharacters(userId: string): Promise<any[]> {
    const likes = await this.databaseService.like.findMany({
      where: {
        userId,
        likeableType: LikeableType.CHARACTER,
      },
      select: {
        likeableId: true,
      },
    });

    const characterIds = likes.map(like => like.likeableId);
    
    if (characterIds.length === 0) {
      return [];
    }

    return this.databaseService.character.findMany({
      where: {
        id: { in: characterIds },
        visibility: 'PUBLIC', // Only return public characters
      },
      include: {
        owner: true,
        tags_rel: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            images: true,
            galleries: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getUserLikedGalleries(userId: string): Promise<any[]> {
    const likes = await this.databaseService.like.findMany({
      where: {
        userId,
        likeableType: LikeableType.GALLERY,
      },
      select: {
        likeableId: true,
      },
    });

    const galleryIds = likes.map(like => like.likeableId);
    
    if (galleryIds.length === 0) {
      return [];
    }

    return this.databaseService.gallery.findMany({
      where: {
        id: { in: galleryIds },
        visibility: 'PUBLIC', // Only return public galleries
      },
      include: {
        owner: true,
        character: true,
        _count: {
          select: {
            images: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getUserLikedImages(userId: string): Promise<any[]> {
    const likes = await this.databaseService.like.findMany({
      where: {
        userId,
        likeableType: LikeableType.IMAGE,
      },
      select: {
        likeableId: true,
      },
    });

    const imageIds = likes.map(like => like.likeableId);
    
    if (imageIds.length === 0) {
      return [];
    }

    return this.databaseService.image.findMany({
      where: {
        id: { in: imageIds },
        visibility: 'PUBLIC', // Only return public images
      },
      include: {
        uploader: true,
        artist: true,
        character: true,
        gallery: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  // Methods for follow lists and activity feed
  async getFollowers(username: string): Promise<{ user: any; followers: any[] }> {
    // First find the user by username
    const user = await this.databaseService.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get all followers
    const follows = await this.databaseService.follow.findMany({
      where: {
        followingId: user.id,
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const followers = follows.map(follow => follow.follower);

    return {
      user,
      followers,
    };
  }

  async getFollowing(username: string): Promise<{ user: any; following: any[] }> {
    // First find the user by username
    const user = await this.databaseService.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get all users this user is following
    const follows = await this.databaseService.follow.findMany({
      where: {
        followerId: user.id,
      },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const following = follows.map(follow => follow.following);

    return {
      user,
      following,
    };
  }

  async getActivityFeed(userId: string, limit = 20, offset = 0): Promise<any[]> {
    // Get list of users that the current user follows
    const following = await this.databaseService.follow.findMany({
      where: {
        followerId: userId,
      },
      select: {
        followingId: true,
      },
    });

    const followingUserIds = following.map(f => f.followingId);
    
    if (followingUserIds.length === 0) {
      return [];
    }

    // Get recent activities from followed users
    // For now, we'll include character creation, gallery creation, and image uploads
    // This could be expanded to include likes and comments in the future

    const [characters, galleries, images] = await Promise.all([
      // Recent characters created by followed users
      this.databaseService.character.findMany({
        where: {
          ownerId: { in: followingUserIds },
          visibility: 'PUBLIC',
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: Math.floor(limit / 3),
        skip: Math.floor(offset / 3),
      }),

      // Recent galleries created by followed users
      this.databaseService.gallery.findMany({
        where: {
          ownerId: { in: followingUserIds },
          visibility: 'PUBLIC',
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: Math.floor(limit / 3),
        skip: Math.floor(offset / 3),
      }),

      // Recent images uploaded by followed users
      this.databaseService.image.findMany({
        where: {
          uploaderId: { in: followingUserIds },
          visibility: 'PUBLIC',
        },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: Math.floor(limit / 3),
        skip: Math.floor(offset / 3),
      }),
    ]);

    // Transform into activity feed format
    const activities = [
      ...characters.map(character => ({
        id: `character_${character.id}`,
        type: 'CHARACTER_CREATED',
        entityId: character.id,
        createdAt: character.createdAt,
        user: character.owner,
        content: {
          name: character.name,
          description: character.description,
        },
      })),
      ...galleries.map(gallery => ({
        id: `gallery_${gallery.id}`,
        type: 'GALLERY_CREATED',
        entityId: gallery.id,
        createdAt: gallery.createdAt,
        user: gallery.owner,
        content: {
          name: gallery.name,
          description: gallery.description,
        },
      })),
      ...images.map(image => ({
        id: `image_${image.id}`,
        type: 'IMAGE_UPLOADED',
        entityId: image.id,
        createdAt: image.createdAt,
        user: image.uploader,
        content: {
          name: image.filename,
          description: image.description,
        },
      })),
    ];

    // Sort by creation date and limit results
    return activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
}