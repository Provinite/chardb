import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { Visibility, Prisma } from "@chardb/database";
import { notDeleted } from "../common/utils/prisma-filters";
import { ImagesService } from "../images/images.service";

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
   * `null` removes the avatar; omitting the field leaves it alone. Any other
   * value is refused: an avatar is set by uploading one (#410).
   */
  avatarImageId?: string | null;
  /** Privacy settings */
  privacySettings?: UserPrivacySettings;
}

@Injectable()
export class UsersService {
  constructor(
    private db: DatabaseService,
    // `forwardRef` to match the module import; see `UsersModule` for why this
    // is a cycle at all.
    @Inject(forwardRef(() => ImagesService))
    private readonly imagesService: ImagesService,
  ) {}

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
    // The picture this is replacing, read before the write so it can be swept
    // up after. Only when the avatar is actually part of this update -- every
    // other field leaves it alone.
    let displacedImageId: string | null = null;
    if (input.avatarImageId !== undefined) {
      // Removal only. An avatar is set by uploading one, through
      // `ImagesService.uploadAvatar` (#410): avatars skip moderation, so the
      // only images that may become one are images uploaded to be one.
      if (input.avatarImageId !== null) {
        throw new BadRequestException(
          "An avatar is set by uploading one; this can only remove it",
        );
      }

      const current = await this.db.user.findUnique({
        where: { id },
        select: { avatarImageId: true },
      });
      displacedImageId = current?.avatarImageId ?? null;

      updateData.avatarImage = { disconnect: true };
    }

    const updated = await this.db.user.update({
      where: { id },
      data: updateData,
    });

    // After the write, so the reference being released is already gone and the
    // count below sees the truth. `cleanupOrphanedImage` decides for itself:
    // an avatar set before #410 can still be a post in somebody's library, and
    // is not rubbish just because it stopped being an avatar.
    if (displacedImageId) {
      await this.imagesService.cleanupOrphanedImage(displacedImageId);
    }

    return updated;
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
