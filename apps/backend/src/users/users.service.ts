import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateUser, UpdateUser } from '../shared/types';
import { UserProfile, UserStats } from './entities/user-profile.entity';
import { Visibility } from '@prisma/client';

// Helper function to add default social fields to User objects
function addDefaultSocialFields(user: any): any {
  return {
    ...user,
    followersCount: 0,
    followingCount: 0,
    userIsFollowing: false,
  };
}

@Injectable()
export class UsersService {
  constructor(private db: DatabaseService) {}

  async create(createUserDto: CreateUser & { password: string }) {
    const { password, ...userData } = createUserDto;
    return this.db.user.create({
      data: {
        ...userData,
        passwordHash: password,
      },
    });
  }

  async findAll(limit = 20, offset = 0) {
    const users = await this.db.user.findMany({
      take: limit,
      skip: offset,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        location: true,
        website: true,
        isVerified: true,
        isAdmin: true,
        privacySettings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const totalCount = await this.db.user.count();

    return {
      nodes: users.map(addDefaultSocialFields),
      totalCount,
      hasNextPage: offset + limit < totalCount,
      hasPreviousPage: offset > 0,
    };
  }

  async findById(id: string) {
    const user = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        location: true,
        website: true,
        dateOfBirth: true,
        isVerified: true,
        isAdmin: true,
        privacySettings: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user ? addDefaultSocialFields(user) : null;
  }

  async findByUsername(username: string) {
    const user = await this.db.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        location: true,
        website: true,
        isVerified: true,
        isAdmin: true,
        privacySettings: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user ? addDefaultSocialFields(user) : null;
  }

  async findByEmail(email: string) {
    return this.db.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUser) {
    const updateData = {
      ...updateUserDto,
      // Convert dateOfBirth string to Date if provided
      ...(updateUserDto.dateOfBirth && {
        dateOfBirth: new Date(updateUserDto.dateOfBirth)
      })
    };
    
    const user = await this.db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        location: true,
        website: true,
        dateOfBirth: true,
        isVerified: true,
        isAdmin: true,
        privacySettings: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return addDefaultSocialFields(user);
  }

  async remove(id: string) {
    await this.db.user.delete({
      where: { id },
    });
    return true;
  }

  async getUserProfile(
    username: string, 
    currentUserId?: string
  ): Promise<UserProfile | null> {
    const user = await this.db.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        location: true,
        website: true,
        isVerified: true,
        isAdmin: true,
        privacySettings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return null;
    }

    const isOwnProfile = currentUserId === user.id;
    const canViewPrivateContent = isOwnProfile || user.isAdmin;

    // Get user statistics
    const stats = await this.getUserStats(user.id, canViewPrivateContent);

    // Get recent content based on privacy settings
    const visibilityFilter = canViewPrivateContent 
      ? [Visibility.PUBLIC, Visibility.UNLISTED, Visibility.PRIVATE]
      : [Visibility.PUBLIC];

    const [recentCharacters, recentGalleries, recentImages] = await Promise.all([
      this.db.character.findMany({
        where: { 
          ownerId: user.id,
          visibility: { in: visibilityFilter }
        },
        take: 6,
        orderBy: { updatedAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            }
          }
        }
      }),
      this.db.gallery.findMany({
        where: { 
          ownerId: user.id,
          visibility: { in: visibilityFilter }
        },
        take: 6,
        orderBy: { updatedAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            }
          },
          character: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      }),
      this.db.image.findMany({
        where: { 
          uploaderId: user.id,
          visibility: { in: visibilityFilter }
        },
        take: 12,
        orderBy: { createdAt: 'desc' },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            }
          },
          character: {
            select: {
              id: true,
              name: true,
            }
          },
          gallery: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      })
    ]);

    // Get featured characters (most recently updated public ones)
    const featuredCharacters = await this.db.character.findMany({
      where: { 
        ownerId: user.id,
        visibility: Visibility.PUBLIC
      },
      take: 3,
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          }
        }
      }
    });

    return {
      user: {
        ...user,
        followersCount: 0, // Will be resolved by field resolver
        followingCount: 0, // Will be resolved by field resolver  
        userIsFollowing: false, // Will be resolved by field resolver
      },
      stats,
      recentCharacters: recentCharacters as any,
      recentGalleries: recentGalleries as any,
      recentImages: recentImages as any,
      featuredCharacters: featuredCharacters as any,
      isOwnProfile,
      canViewPrivateContent,
    };
  }

  async getUserStats(userId: string, includePrivate = false): Promise<UserStats> {
    const visibilityFilter = includePrivate 
      ? [Visibility.PUBLIC, Visibility.UNLISTED, Visibility.PRIVATE]
      : [Visibility.PUBLIC];

    const [charactersCount, galleriesCount, imagesCount] = await Promise.all([
      this.db.character.count({
        where: { 
          ownerId: userId,
          visibility: { in: visibilityFilter }
        }
      }),
      this.db.gallery.count({
        where: { 
          ownerId: userId,
          visibility: { in: visibilityFilter }
        }
      }),
      this.db.image.count({
        where: { 
          uploaderId: userId,
          visibility: { in: visibilityFilter }
        }
      })
    ]);

    // TODO: Implement views, likes, and follows when those systems are added
    return {
      charactersCount,
      galleriesCount,
      imagesCount,
      totalViews: 0,
      totalLikes: 0,
      followersCount: 0,
      followingCount: 0,
    };
  }
}