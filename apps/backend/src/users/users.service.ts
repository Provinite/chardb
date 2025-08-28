import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { UserStats } from "./entities/user-profile.entity";
import { Visibility, Prisma } from "@chardb/database";

/**
 * Service layer input types for user operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of GraphQL relation objects.
 */

/**
 * Input data for creating a new user
 */
export interface CreateUserServiceInput {
  /** User's unique username */
  username: string;
  /** User's email address */
  email: string;
  /** User's hashed password */
  passwordHash: string;
  /** Optional display name */
  displayName?: string;
}

/**
 * Input data for updating a user
 */
export interface UpdateUserServiceInput {
  /** User's display name */
  displayName?: string;
  /** User's bio */
  bio?: string;
  /** User's location */
  location?: string;
  /** User's website */
  website?: string;
  /** User's date of birth */
  dateOfBirth?: Date;
  /** Privacy settings as JSON */
  privacySettings?: any;
}

type PrismaUser = Prisma.UserGetPayload<{}>;

@Injectable()
export class UsersService {
  constructor(private db: DatabaseService) {}

  async create(input: CreateUserServiceInput) {
    return this.db.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
      },
    });
  }

  async findAll(limit = 20, offset = 0) {
    const [users, totalCount] = await Promise.all([
      this.db.user.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      }),
      this.db.user.count(),
    ]);

    return {
      nodes: users,
      totalCount,
      hasNextPage: offset + limit < totalCount,
      hasPreviousPage: offset > 0,
    };
  }

  async findById(id: string) {
    return this.db.user.findUnique({
      where: { id },
    });
  }

  async findByUsername(username: string) {
    return this.db.user.findUnique({
      where: { username },
    });
  }

  async findByEmail(email: string) {
    return this.db.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, input: UpdateUserServiceInput) {
    const updateData: Prisma.UserUpdateInput = {};

    if (input.displayName !== undefined)
      updateData.displayName = input.displayName;
    if (input.bio !== undefined) updateData.bio = input.bio;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.website !== undefined) updateData.website = input.website;
    if (input.dateOfBirth !== undefined)
      updateData.dateOfBirth = input.dateOfBirth;
    if (input.privacySettings !== undefined)
      updateData.privacySettings = input.privacySettings;

    return this.db.user.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    return this.db.user.delete({
      where: { id },
    });
  }

  async getUserProfile(
    username: string,
    currentUserId?: string,
  ) {
    const user = await this.db.user.findUnique({
      where: { username },
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

    const [recentCharacters, recentGalleries, recentMedia] = await Promise.all([
      this.db.character.findMany({
        where: {
          ownerId: user.id,
          visibility: { in: visibilityFilter },
        },
        take: 6,
        orderBy: { updatedAt: "desc" },
      }),
      this.db.gallery.findMany({
        where: {
          ownerId: user.id,
          visibility: { in: visibilityFilter },
        },
        take: 6,
        orderBy: { updatedAt: "desc" },
      }),
      this.db.media.findMany({
        where: {
          ownerId: user.id,
          imageId: { not: null }, // Only include image media
        },
        take: 12,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Get featured characters (most recently updated public ones)
    const featuredCharacters = await this.db.character.findMany({
      where: {
        ownerId: user.id,
        visibility: Visibility.PUBLIC,
      },
      take: 3,
      orderBy: { updatedAt: "desc" },
    });

    return {
      user,
      stats,
      recentCharacters,
      recentGalleries,
      recentMedia,
      featuredCharacters,

      isOwnProfile,
      canViewPrivateContent,
    };
  }

  async getUserStats(
    userId: string,
    includePrivate = false,
  ): Promise<UserStats> {
    const visibilityFilter = includePrivate
      ? [Visibility.PUBLIC, Visibility.UNLISTED, Visibility.PRIVATE]
      : [Visibility.PUBLIC];

    const [charactersCount, galleriesCount, imagesCount] = await Promise.all([
      this.db.character.count({
        where: {
          ownerId: userId,
          visibility: { in: visibilityFilter },
        },
      }),
      this.db.gallery.count({
        where: {
          ownerId: userId,
          visibility: { in: visibilityFilter },
        },
      }),
      this.db.image.count({
        where: {
          uploaderId: userId,
        },
      }),
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
