import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { Visibility, Prisma } from "@chardb/database";

/**
 * Service layer input types for user operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of GraphQL relation objects.
 */

/**
 * Privacy settings interface for users
 */
export interface UserPrivacySettings {
  /** Whether profile is visible to public */
  profileVisible?: boolean;
  /** Whether to show online status */
  showOnlineStatus?: boolean;
  /** Whether to allow direct messages */
  allowDirectMessages?: boolean;
  /** Who can comment on user's content */
  allowCommentsFrom?: 'everyone' | 'following' | 'none';
}

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
  /** Privacy settings */
  privacySettings?: UserPrivacySettings;
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

  async getUserCharactersCount(userId: string, includePrivate = false) {
    const visibilityFilter = includePrivate
      ? [Visibility.PUBLIC, Visibility.UNLISTED, Visibility.PRIVATE]
      : [Visibility.PUBLIC];

    return this.db.character.count({
      where: {
        ownerId: userId,
        visibility: { in: visibilityFilter },
      },
    });
  }

  async getUserGalleriesCount(userId: string, includePrivate = false) {
    const visibilityFilter = includePrivate
      ? [Visibility.PUBLIC, Visibility.UNLISTED, Visibility.PRIVATE]
      : [Visibility.PUBLIC];

    return this.db.gallery.count({
      where: {
        ownerId: userId,
        visibility: { in: visibilityFilter },
      },
    });
  }

  async getUserImagesCount(userId: string) {
    return this.db.image.count({
      where: {
        uploaderId: userId,
      },
    });
  }

  async getUserRecentCharacters(userId: string, includePrivate = false, limit = 6) {
    const visibilityFilter = includePrivate
      ? [Visibility.PUBLIC, Visibility.UNLISTED, Visibility.PRIVATE]
      : [Visibility.PUBLIC];

    return this.db.character.findMany({
      where: {
        ownerId: userId,
        visibility: { in: visibilityFilter },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });
  }

  async getUserRecentGalleries(userId: string, includePrivate = false, limit = 6) {
    const visibilityFilter = includePrivate
      ? [Visibility.PUBLIC, Visibility.UNLISTED, Visibility.PRIVATE]
      : [Visibility.PUBLIC];

    return this.db.gallery.findMany({
      where: {
        ownerId: userId,
        visibility: { in: visibilityFilter },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });
  }

  async getUserRecentMedia(userId: string, limit = 12) {
    return this.db.media.findMany({
      where: {
        ownerId: userId,
        imageId: { not: null }, // Only include image media
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  async getUserFeaturedCharacters(userId: string, limit = 3) {
    return this.db.character.findMany({
      where: {
        ownerId: userId,
        visibility: Visibility.PUBLIC,
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });
  }
}
