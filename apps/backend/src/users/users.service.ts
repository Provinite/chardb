import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { Visibility, Prisma, ModerationStatus } from "@chardb/database";
import { notDeleted } from "../common/utils/prisma-filters";

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
  allowCommentsFrom?: "everyone" | "following" | "none";
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
  /** User's website */
  website?: string;
  /** User's date of birth */
  dateOfBirth?: Date;
  /**
   * The image to use as this user's avatar. `null` removes it; omitting the
   * field leaves the current avatar alone.
   */
  avatarImageId?: string | null;
  /** Privacy settings */
  privacySettings?: UserPrivacySettings;
}

@Injectable()
export class UsersService {
  constructor(private db: DatabaseService) {}

  async create(input: CreateUserServiceInput) {
    return this.db.user.create({
      data: {
        username: input.username,
        email: input.email.toLowerCase(),
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
      where: { email: email.toLowerCase() },
    });
  }

  async update(id: string, input: UpdateUserServiceInput) {
    const updateData: Prisma.UserUpdateInput = {};

    if (input.displayName !== undefined)
      updateData.displayName = input.displayName;
    if (input.bio !== undefined) updateData.bio = input.bio;
    if (input.website !== undefined) updateData.website = input.website;
    if (input.dateOfBirth !== undefined)
      updateData.dateOfBirth = input.dateOfBirth;
    if (input.privacySettings !== undefined)
      updateData.privacySettings = input.privacySettings;
    if (input.avatarImageId !== undefined) {
      await this.assertUsableAsAvatar(id, input.avatarImageId);
      updateData.avatarImage = input.avatarImageId
        ? { connect: { id: input.avatarImageId } }
        : { disconnect: true };
    }

    return this.db.user.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Whether `userId` may put `imageId` on their profile.
   *
   * Two gates, and both are load-bearing:
   *
   * Ownership, because the column takes a bare id and nothing else checks it.
   * Without this, any id in the table can be pointed at -- someone else's
   * unlisted art, or an image whose media is private -- and displayed under
   * your name.
   *
   * Approval, because an avatar is the one image in the app that renders
   * without going through `Media.image`, which is where every other surface
   * masks the URLs of anything not APPROVED. It is checked again at read time
   * (`UsersResolver.resolveAvatarImage`) rather than only here, because
   * approval is revocable: `rejectImage` turns an APPROVED image REJECTED and
   * nothing clears the column, so a write-time check alone would let a
   * rejected picture keep showing on every byline in the app forever.
   */
  private async assertUsableAsAvatar(
    userId: string,
    imageId: string | null,
  ): Promise<void> {
    if (!imageId) return;

    const image = await this.db.image.findUnique({
      where: { id: imageId },
      select: { uploaderId: true, moderationStatus: true },
    });

    // Not found and not yours are the same answer on purpose. Distinguishing
    // them turns this into a way to ask whether an id exists.
    if (!image || image.uploaderId !== userId) {
      throw new NotFoundException(
        "That image does not exist, or was not uploaded by you",
      );
    }

    if (image.moderationStatus !== ModerationStatus.APPROVED) {
      throw new BadRequestException(
        image.moderationStatus === ModerationStatus.REJECTED
          ? "That image was rejected in moderation and cannot be used as an avatar"
          : "That image is still waiting on moderation. It can be your avatar once it is approved",
      );
    }
  }

  async getUserCharactersCount(userId: string, includePrivate = false) {
    const visibilityFilter = includePrivate
      ? [Visibility.PUBLIC, Visibility.UNLISTED, Visibility.PRIVATE]
      : [Visibility.PUBLIC];

    return this.db.character.count({
      where: {
        ownerId: userId,
        visibility: { in: visibilityFilter },
        ...notDeleted,
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

  /**
   * How much of this user's image media the asker is allowed to see.
   *
   * Counted through `media` rather than `image`, because visibility lives on
   * the media row -- `image` has no such column, so the old
   * `image.count({ uploaderId })` could not have filtered even in principle.
   * It counted every image the user had ever uploaded, private ones included,
   * and put the number on a public profile.
   *
   * PUBLIC only for a visitor, exactly like the two counters above: this
   * number labels a listing, and unlisted media is by definition not listed.
   */
  async getUserImagesCount(userId: string, includePrivate = false) {
    const visibilityFilter = includePrivate
      ? [Visibility.PUBLIC, Visibility.UNLISTED, Visibility.PRIVATE]
      : [Visibility.PUBLIC];

    return this.db.media.count({
      where: {
        ownerId: userId,
        imageId: { not: null },
        visibility: { in: visibilityFilter },
      },
    });
  }

  async getUserRecentCharacters(
    userId: string,
    includePrivate = false,
    limit = 6,
  ) {
    const visibilityFilter = includePrivate
      ? [Visibility.PUBLIC, Visibility.UNLISTED, Visibility.PRIVATE]
      : [Visibility.PUBLIC];

    return this.db.character.findMany({
      where: {
        ownerId: userId,
        visibility: { in: visibilityFilter },
        ...notDeleted,
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });
  }

  async getUserRecentGalleries(
    userId: string,
    includePrivate = false,
    limit = 6,
  ) {
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

  /**
   * The profile's "Recent Media" strip.
   *
   * Took no viewer and applied no visibility filter until #348: a member's
   * PRIVATE media was drawn on their public profile, to anyone, signed out
   * included. Its two neighbours above have taken `includePrivate` all along.
   *
   * UNLISTED is excluded from a visitor's view for the same reason as in
   * `getUserImagesCount`: a strip on a profile is a listing.
   */
  async getUserRecentMedia(userId: string, includePrivate = false, limit = 12) {
    const visibilityFilter = includePrivate
      ? [Visibility.PUBLIC, Visibility.UNLISTED, Visibility.PRIVATE]
      : [Visibility.PUBLIC];

    return this.db.media.findMany({
      where: {
        ownerId: userId,
        imageId: { not: null }, // Only include image media
        visibility: { in: visibilityFilter },
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
        ...notDeleted,
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });
  }
}
