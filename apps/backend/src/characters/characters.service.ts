import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { TagsService } from "../tags/tags.service";
import { PendingOwnershipService } from "../pending-ownership/pending-ownership.service";
import { DiscordService } from "../discord/discord.service";
import { DeviantArtService } from "../deviantart/deviantart.service";
import { PermissionService } from "../auth/PermissionService";
import { CommunityPermission } from "../auth/CommunityPermission";
import {
  Prisma,
  Visibility,
  ExternalAccountProvider,
  ModerationStatus,
  TraitReviewSource,
  TraitValueType,
} from "@chardb/database";
import { TraitReviewService } from "../trait-review/trait-review.service";
import { notDeleted } from "../common/utils/prisma-filters";
import {
  availabilityWhere,
  CharacterAvailability,
} from "./character-availability";

/**
 * Field classification for permission checks.
 * Profile fields can be edited by owners with canEditOwnCharacter.
 * Registry fields require canEditOwnCharacterRegistry or canEditCharacterRegistry.
 */

const PROFILE_FIELDS = new Set([
  "name",
  "details",
  "visibility",
  "isSellable",
  "isTradeable",
  "isSellableForCoin",
  "isTradeableForArt",
  "isOpenToOffers",
  "isFreebie",
  "price",
  "customFields",
  "mainMedia",
]);

const REGISTRY_FIELDS = new Set([
  "registryId",
  "speciesVariant",
  "traitValues",
]);

export interface PendingOwnerInput {
  provider: ExternalAccountProvider;
  providerAccountId: string;
}

// Service layer interfaces
export interface CharacterServiceFilters {
  limit?: number;
  offset?: number;
  search?: string;
  species?: string;
  speciesId?: string;
  speciesVariantId?: string;
  communityId?: string;
  tags?: string[];
  ownerId?: string;
  visibility?: Visibility;
  isSellable?: boolean;
  isTradeable?: boolean;
  availability?: CharacterAvailability[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: string;
  searchFields?: string;
}

@Injectable()
export class CharactersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly tagsService: TagsService,
    private readonly pendingOwnershipService: PendingOwnershipService,
    private readonly discordService: DiscordService,
    private readonly deviantArtService: DeviantArtService,
    private readonly permissionService: PermissionService,
    private readonly traitReviewService: TraitReviewService,
  ) {}

  async create(
    userId: string,
    input: {
      characterData: Omit<Prisma.CharacterCreateInput, "owner" | "creator">;
      tags?: string[];
      pendingOwner?: PendingOwnerInput; // Pending ownership info
      assignToSelf?: boolean; // Whether to assign ownership to the creator
      traitReviewSource?: TraitReviewSource; // Source for auto-created trait review
    },
  ) {
    const { characterData, tags, assignToSelf = true } = input;
    const pendingOwner = input.pendingOwner;

    // Determine the actual owner:
    // - If pendingOwner is provided, character is orphaned (ownerId = null)
    // - If assignToSelf is false, character is orphaned (ownerId = null)
    // - Otherwise, owner is the current user (userId)
    // - Can be reassigned if external account is already claimed
    const actualOwnerId = pendingOwner || !assignToSelf ? null : userId;

    // Extract speciesId early for validation and Discord resolution
    const speciesId = characterData.species?.connect?.id;
    const traitValues = characterData.traitValues;

    if (speciesId) {
      await this.assertCanCreateForSpecies(userId, speciesId);
    }

    // Validate trait values if species and trait values are provided
    if (
      speciesId &&
      traitValues &&
      Array.isArray(traitValues) &&
      traitValues.length > 0
    ) {
      await this.validateTraitValues(speciesId, traitValues);
    }

    // PRE-VALIDATION: Resolve Discord identifier BEFORE creating character
    // This ensures atomicity - if Discord lookup fails, no character is created
    let resolvedAccountId: string | undefined;
    let displayIdentifier: string | undefined;

    if (pendingOwner) {
      if (!speciesId) {
        throw new BadRequestException(
          "Species ID is required when creating a character with pending ownership",
        );
      }

      // Resolve Discord username to ID if necessary
      if (pendingOwner.provider === ExternalAccountProvider.DISCORD) {
        // Check if the input is already a numeric ID
        const isNumericId = /^\d{17,19}$/.test(pendingOwner.providerAccountId);

        // If it's not an ID (i.e., it's a username), store it as displayIdentifier
        if (!isNumericId) {
          displayIdentifier = pendingOwner.providerAccountId;
        }

        // CRITICAL: This happens BEFORE character creation
        // If this throws an error, no character will be created
        resolvedAccountId = await this.resolveDiscordIdentifier(
          speciesId,
          pendingOwner.providerAccountId,
        );
      } else if (pendingOwner.provider === ExternalAccountProvider.DEVIANTART) {
        // DeviantArt uses usernames in the UI, but OAuth stores UUIDs.
        // Resolve the username to a UUID so it matches external_accounts.
        const resolved = await this.deviantArtService.resolveUsername(
          pendingOwner.providerAccountId,
        );
        resolvedAccountId = resolved.uuid;
        displayIdentifier = resolved.username;
      }

      // Note: Auto-claim logic is now handled inside createForCharacter
    }

    // Now create the character (only if all validations passed)
    // Use interactive transaction so trait review creation is atomic with character creation
    const character = await this.db.$transaction(async (tx) => {
      const created = await tx.character.create({
        data: {
          // Owner connection (may be null for orphaned characters)
          ...(actualOwnerId
            ? { owner: { connect: { id: actualOwnerId } } }
            : {}),
          // Creator is always the user creating the character
          creator: {
            connect: { id: userId },
          },
          ...characterData,
        },
      });

      // Auto-create trait review if character has trait values
      if (traitValues && Array.isArray(traitValues) && traitValues.length > 0) {
        await this.traitReviewService.createReview(
          created.id,
          input.traitReviewSource ?? TraitReviewSource.CREATION,
          traitValues,
          [],
          tx,
        );
      }

      return created;
    });

    // Handle tags if provided
    if (tags && tags.length > 0) {
      const tagModels = await this.tagsService.findOrCreateTags(tags);

      for (const tag of tagModels) {
        await this.db.characterTag.create({
          data: {
            characterId: character.id,
            tagId: tag.id,
          },
        });
      }
    }

    // Create pending ownership record if provided (with auto-claim)
    // Note: resolvedAccountId is already validated above
    // createForCharacter will auto-claim if the account is already linked
    if (pendingOwner && resolvedAccountId) {
      await this.pendingOwnershipService.createForCharacter(
        character.id,
        pendingOwner.provider,
        resolvedAccountId,
        displayIdentifier,
      );
    }

    // Return the created character (re-fetch to get latest state including auto-claim)
    const finalCharacter = await this.db.character.findUnique({
      where: { id: character.id },
    });
    if (!finalCharacter) {
      throw new NotFoundException("Character not found after creation");
    }
    return finalCharacter;
  }

  async findAll(filters: CharacterServiceFilters = {}, userId?: string) {
    const {
      limit = 20,
      offset = 0,
      search,
      species,
      speciesId,
      speciesVariantId,
      communityId,
      tags,
      ownerId,
      visibility,
      isSellable,
      isTradeable,
      availability,
      minPrice,
      maxPrice,
      sortBy = "created",
      sortOrder = "desc",
      searchFields = "all",
    } = filters;

    const where: Prisma.CharacterWhereInput = {
      AND: [
        notDeleted,

        // Visibility filter - only show public characters unless owner/admin
        userId
          ? {
              OR: [
                { visibility: Visibility.PUBLIC },
                { ownerId: userId }, // Owner can see their own private characters
                { visibility: Visibility.UNLISTED }, // Unlisted characters are visible if you have the link
              ],
            }
          : { visibility: Visibility.PUBLIC }, // Only public for anonymous users

        // Enhanced search filter
        search
          ? {
              OR: this.buildSearchConditions(search, searchFields),
            }
          : {},

        // Other filters
        species
          ? { species: { name: { contains: species, mode: "insensitive" } } }
          : {},
        speciesId ? { speciesId } : {},
        speciesVariantId ? { speciesVariantId } : {},
        communityId ? { species: { communityId } } : {},
        ownerId ? { ownerId } : {},
        visibility !== undefined ? { visibility } : {},
        isSellable !== undefined ? { isSellable } : {},
        isTradeable !== undefined ? { isTradeable } : {},

        // AND'd against the two above, not merged with them. They are separate
        // questions: `isTradeable: false` asks for characters that are not
        // open to trades, which a list of things to include cannot express.
        availabilityWhere(availability),

        // Price range filter
        minPrice !== undefined || maxPrice !== undefined
          ? {
              AND: [
                minPrice !== undefined ? { price: { gte: minPrice } } : {},
                maxPrice !== undefined ? { price: { lte: maxPrice } } : {},
              ],
            }
          : {},

        // Tags filter
        tags && tags.length > 0
          ? {
              tags_rel: {
                some: {
                  tag: {
                    name: { in: tags },
                  },
                },
              },
            }
          : {},
      ],
    };

    const [characters, total] = await Promise.all([
      this.db.character.findMany({
        where,
        orderBy: this.buildOrderBy(sortBy, sortOrder),
        take: limit,
        skip: offset,
      }),
      this.db.character.count({ where }),
    ]);

    return {
      characters,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Find all characters that the user can edit based on community permissions.
   * This includes:
   * - Characters owned by the user without a species (always editable by owner)
   * - Characters owned by the user with a species (where user has canEditOwnCharacter in the community)
   * - Any character in communities where user has canEditCharacter permission
   * - Orphaned characters in communities where user has canCreateOrphanedCharacter or canEditCharacter permission
   */
  async findEditableCharacters(
    userId: string,
    filters: CharacterServiceFilters = {},
  ) {
    const { limit = 20, offset = 0, search } = filters;

    const where: Prisma.CharacterWhereInput = {
      ...notDeleted,
      // Add search filter if provided
      ...(search && {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
      }),
      OR: [
        // User owns the character without a species (always editable)
        {
          ownerId: userId,
          speciesId: null,
        },
        // User owns the character AND has canEditOwnCharacter permission (profile fields)
        {
          ownerId: userId,
          species: {
            community: {
              roles: {
                some: {
                  canEditOwnCharacter: true,
                  communityMembers: {
                    some: {
                      userId: userId,
                    },
                  },
                },
              },
            },
          },
        },
        // User owns the character AND has canEditOwnCharacterRegistry permission (registry fields)
        {
          ownerId: userId,
          species: {
            community: {
              roles: {
                some: {
                  canEditOwnCharacterRegistry: true,
                  communityMembers: {
                    some: {
                      userId: userId,
                    },
                  },
                },
              },
            },
          },
        },
        // User has canEditCharacter permission (any character profile fields)
        {
          species: {
            community: {
              roles: {
                some: {
                  canEditCharacter: true,
                  communityMembers: {
                    some: {
                      userId: userId,
                    },
                  },
                },
              },
            },
          },
        },
        // User has canEditCharacterRegistry permission (any character registry fields)
        {
          species: {
            community: {
              roles: {
                some: {
                  canEditCharacterRegistry: true,
                  communityMembers: {
                    some: {
                      userId: userId,
                    },
                  },
                },
              },
            },
          },
        },
        // Orphaned character with canCreateOrphanedCharacter permission
        {
          ownerId: null,
          species: {
            community: {
              roles: {
                some: {
                  canCreateOrphanedCharacter: true,
                  communityMembers: {
                    some: {
                      userId: userId,
                    },
                  },
                },
              },
            },
          },
        },
      ],
    };

    const [characters, total] = await Promise.all([
      this.db.character.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.db.character.count({ where }),
    ]);

    return {
      characters,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Find all characters that the user can upload images to based on community permissions.
   * This includes:
   * - Characters owned by the user without a species (always allowed)
   * - Characters owned by the user with a species (where user has canUploadOwnCharacterImages in the community)
   * - Any character in communities where user has canUploadCharacterImages permission
   */
  async findCharactersForImageUpload(
    userId: string,
    filters: CharacterServiceFilters = {},
  ) {
    const { limit = 20, offset = 0, search } = filters;

    const where: Prisma.CharacterWhereInput = {
      ...notDeleted,
      // Add search filter if provided
      ...(search && {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
      }),
      OR: [
        // User owns the character without a species (always allowed)
        {
          ownerId: userId,
          speciesId: null,
        },
        // User owns the character AND has canUploadOwnCharacterImages permission in the community
        {
          ownerId: userId,
          species: {
            community: {
              roles: {
                some: {
                  canUploadOwnCharacterImages: true,
                  communityMembers: {
                    some: {
                      userId: userId,
                    },
                  },
                },
              },
            },
          },
        },
        // User has canUploadCharacterImages permission in the community (can upload to any character)
        {
          species: {
            community: {
              roles: {
                some: {
                  canUploadCharacterImages: true,
                  communityMembers: {
                    some: {
                      userId: userId,
                    },
                  },
                },
              },
            },
          },
        },
      ],
    };

    const [characters, total] = await Promise.all([
      this.db.character.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.db.character.count({ where }),
    ]);

    return {
      characters,
      total,
      hasMore: offset + limit < total,
    };
  }

  async findOne(id: string, userId?: string) {
    const character = await this.db.character.findFirst({
      where: { id, ...notDeleted },
    });

    if (!character) {
      throw new NotFoundException("Character not found");
    }

    // Check visibility permissions
    if (character.visibility === Visibility.PRIVATE) {
      if (!userId || character.ownerId !== userId) {
        throw new ForbiddenException("Character is private");
      }
    }

    return character;
  }

  async update(
    id: string,
    userId: string,
    input: {
      characterData: Prisma.CharacterUpdateInput;
      tags?: string[];
      pendingOwner?: PendingOwnerInput | null;
      ownerId?: string | null;
    },
  ) {
    const character = await this.findOne(id, userId);

    const { characterData, tags, pendingOwner, ownerId } = input;

    // Validate field-level permissions if character has a species (community context)
    if (character.speciesId) {
      const species = await this.db.species.findUnique({
        where: { id: character.speciesId },
        select: { communityId: true },
      });
      if (species) {
        await this.validateFieldPermissions(
          userId,
          character,
          characterData,
          tags,
          species.communityId,
        );
      }
    }

    // Prevent changing species once it's set
    if (characterData.species !== undefined && character.speciesId) {
      // The species field in the update input is either {connect: {id}} or {disconnect: true}
      const speciesUpdate = characterData.species;

      // If trying to connect to a different species or disconnect
      if (
        speciesUpdate?.disconnect ||
        (speciesUpdate?.connect?.id &&
          speciesUpdate.connect.id !== character.speciesId)
      ) {
        throw new ForbiddenException(
          "Cannot change species once it has been set. Species assignment is permanent.",
        );
      }
    }

    const updatedCharacter = await this.db.character.update({
      where: { id },
      data: characterData,
    });

    // Handle tags if provided
    if (tags !== undefined) {
      // Remove all existing character-tag relationships
      await this.db.characterTag.deleteMany({
        where: { characterId: id },
      });

      // Add new tags if provided
      if (tags.length > 0) {
        const tagModels = await this.tagsService.findOrCreateTags(tags);

        for (const tag of tagModels) {
          await this.db.characterTag.create({
            data: {
              characterId: id,
              tagId: tag.id,
            },
          });
        }
      }
    }

    // Handle ownership changes (if ownerId is being modified)
    if (ownerId !== undefined) {
      const oldOwnerId = character.ownerId;

      // Only update if ownership is actually changing
      if (oldOwnerId !== ownerId) {
        // Verify new owner exists if setting to a user
        if (ownerId !== null) {
          const newOwner = await this.db.user.findUnique({
            where: { id: ownerId },
          });
          if (!newOwner) {
            throw new NotFoundException("New owner not found");
          }
        }

        // Update character ownership
        await this.db.character.update({
          where: { id },
          data: { ownerId },
        });

        // Create ownership change audit record (only when transferring to a user)
        // Note: We don't create audit records for orphaning (toUserId null) since the schema requires toUserId
        if (ownerId !== null) {
          await this.db.characterOwnershipChange.create({
            data: {
              characterId: id,
              fromUserId: oldOwnerId,
              toUserId: ownerId,
            },
          });
        }

        // If setting an actual owner, clear any pending ownership
        if (ownerId !== null) {
          const existingPending =
            await this.pendingOwnershipService.findByCharacterId(id);
          if (existingPending) {
            await this.pendingOwnershipService.remove(existingPending.id);
          }
        }
      }
    }

    // Handle pending ownership updates
    if (pendingOwner !== undefined) {
      // Get existing pending ownership
      const existingPending =
        await this.pendingOwnershipService.findByCharacterId(id);

      if (pendingOwner === null) {
        // Clear pending ownership
        if (existingPending) {
          await this.pendingOwnershipService.remove(existingPending.id);
        }
      } else {
        // Set or update pending ownership
        const { provider, providerAccountId } = pendingOwner;

        // Ensure character has a species
        if (!updatedCharacter.speciesId) {
          throw new BadRequestException(
            "Cannot set pending ownership on a character without a species",
          );
        }

        let resolvedAccountId = providerAccountId;
        let displayIdentifier: string | undefined;

        // Resolve Discord username to ID if necessary
        if (provider === ExternalAccountProvider.DISCORD) {
          // Check if the input is already a numeric ID
          const isNumericId = /^\d{17,19}$/.test(providerAccountId);

          // If it's not an ID (i.e., it's a username), store it as displayIdentifier
          if (!isNumericId) {
            displayIdentifier = providerAccountId;
          }

          resolvedAccountId = await this.resolveDiscordIdentifier(
            updatedCharacter.speciesId,
            providerAccountId,
          );
        } else if (provider === ExternalAccountProvider.DEVIANTART) {
          // DeviantArt uses usernames in the UI, but OAuth stores UUIDs.
          // Resolve the username to a UUID so it matches external_accounts.
          const resolved =
            await this.deviantArtService.resolveUsername(providerAccountId);
          resolvedAccountId = resolved.uuid;
          displayIdentifier = resolved.username;
        }

        // Remove old pending ownership if exists
        if (existingPending) {
          await this.pendingOwnershipService.remove(existingPending.id);
        }

        // Create new pending ownership (with auto-claim if account is already linked)
        // The service will auto-claim if the external account is already linked to a user
        const result = await this.pendingOwnershipService.createForCharacter(
          id,
          provider,
          resolvedAccountId,
          displayIdentifier,
        );

        // If the character was auto-claimed, update the ownerId that was set earlier
        // This ensures the character ownership reflects the auto-claim
        if (result.claimed && result.ownerId) {
          // Character was auto-claimed - ownership is already updated by the service
          // No additional action needed
        }
      }
    }

    // Return the updated character (re-fetch to get latest state)
    const finalCharacter = await this.db.character.findUnique({
      where: { id },
    });
    if (!finalCharacter) {
      throw new NotFoundException("Character not found after update");
    }
    return finalCharacter;
  }

  /**
   * Refuse to dispose of a character whose redemption is still being reviewed.
   *
   * A pending MYO or edit-kit review means a member has already spent an item
   * on this character -- the item is destroyed and gone by the time a reviewer
   * sees the card. Refusing the review is what hands it back.
   *
   * Every path below (`softDelete`, `purge`, `kickFromSpecies`) resolves
   * pending reviews to CANCELLED on its way past. That is fine for a review of
   * something the member did not pay for, and quietly catastrophic for one
   * they did: the return path is guarded on the review still being PENDING, so
   * cancelling it does not merely skip the refund, it **closes the only door
   * to it**. The item is then unrecoverable through any route in the product.
   *
   * So this orders the steps rather than taking anything away. Refuse first --
   * which returns the item and leaves a ledger row saying so -- then delete.
   * Staff who do not want the member keeping the item can revoke it
   * afterwards, which is one more step and a great deal more evidence than a
   * silent confiscation.
   *
   * Narrow on purpose: a CREATION or IMPORT review has no item behind it and
   * blocks nothing.
   */
  private async assertNoPendingRedemption(characterId: string) {
    const pending = await this.db.traitReview.findFirst({
      where: {
        characterId,
        status: ModerationStatus.PENDING,
        source: {
          in: [TraitReviewSource.MYO, TraitReviewSource.USER_EDIT],
        },
      },
      select: { source: true },
    });
    if (!pending) return;

    const what =
      pending.source === TraitReviewSource.MYO
        ? "an MYO redemption"
        : "a trait change bought with an item";

    throw new BadRequestException(
      `This character has ${what} awaiting review. Refuse the review first — ` +
        `that returns the item to its holder — and then do this. Deleting it ` +
        `now would cancel the review and leave the item spent with no way to ` +
        `hand it back.`,
    );
  }

  async softDelete(id: string, userId: string): Promise<boolean> {
    const character = await this.db.character.findFirst({
      where: { id, ...notDeleted },
    });
    if (!character) {
      throw new NotFoundException("Character not found");
    }

    await this.assertNoPendingRedemption(id);

    await this.db.$transaction(async (tx) => {
      await tx.character.update({
        where: { id },
        data: { deletedAt: new Date(), deletedById: userId },
      });
      await tx.traitReview.updateMany({
        where: { characterId: id, status: ModerationStatus.PENDING },
        data: { status: ModerationStatus.CANCELLED },
      });
    });

    return true;
  }

  async purge(id: string): Promise<boolean> {
    const character = await this.db.character.findFirst({ where: { id } });
    if (!character) {
      throw new NotFoundException("Character not found");
    }

    await this.assertNoPendingRedemption(id);

    await this.db.$transaction(async (tx) => {
      await tx.traitReview.updateMany({
        where: { characterId: id, status: ModerationStatus.PENDING },
        data: { status: ModerationStatus.CANCELLED },
      });
      await tx.character.delete({ where: { id } });
    });
    return true;
  }

  async kickFromSpecies(id: string): Promise<boolean> {
    const character = await this.db.character.findFirst({
      where: { id, ...notDeleted },
    });
    if (!character) {
      throw new NotFoundException("Character not found");
    }
    await this.assertNoPendingRedemption(id);

    if (!character.speciesId) {
      throw new BadRequestException(
        "Character does not have a species assigned",
      );
    }

    const traitValues =
      character.traitValues as PrismaJson.CharacterTraitValuesJson;

    const flattenedFields = await this.flattenTraitValues(
      character.speciesId,
      traitValues,
    );

    const existingCustomFields =
      character.customFields &&
      typeof character.customFields === "object" &&
      !Array.isArray(character.customFields)
        ? (character.customFields as Record<string, string>)
        : {};

    await this.db.$transaction(async (tx) => {
      await tx.traitReview.updateMany({
        where: { characterId: id, status: ModerationStatus.PENDING },
        data: { status: ModerationStatus.CANCELLED },
      });
      await tx.character.update({
        where: { id },
        data: {
          speciesId: null,
          speciesVariantId: null,
          registryId: null,
          traitValues: [],
          traitReviewStatus: null,
          // Trait values take precedence over any existing custom field with
          // the same name — the structured species data is more authoritative
          // than a freeform field the owner may have set manually.
          customFields: { ...existingCustomFields, ...flattenedFields },
        },
      });
    });

    return true;
  }

  private async flattenTraitValues(
    speciesId: string,
    traitValues: PrismaJson.CharacterTraitValuesJson,
  ): Promise<Record<string, string>> {
    if (!traitValues.length) return {};

    const traitIds = [...new Set(traitValues.map((tv) => tv.traitId))];

    const traits = await this.db.trait.findMany({
      where: { id: { in: traitIds }, speciesId },
      select: { id: true, name: true, valueType: true },
    });
    const traitMap = new Map(traits.map((t) => [t.id, t]));

    const enumTraitIds = traits
      .filter((t) => t.valueType === TraitValueType.ENUM)
      .map((t) => t.id);

    const enumValues =
      enumTraitIds.length > 0
        ? await this.db.enumValue.findMany({
            where: { traitId: { in: enumTraitIds } },
            select: { id: true, traitId: true, name: true },
          })
        : [];

    // Index by both lowercased name AND UUID to handle both storage formats
    const enumValueMap = new Map<string, string>();
    for (const ev of enumValues) {
      enumValueMap.set(
        `${ev.traitId}::${String(ev.name).toLowerCase()}`,
        ev.name,
      );
      enumValueMap.set(`${ev.traitId}::${ev.id}`, ev.name);
    }

    const result: Record<string, string> = {};

    for (const tv of traitValues) {
      const trait = traitMap.get(tv.traitId);
      if (!trait || tv.value === null || tv.value === undefined) continue;

      let displayValue: string;
      if (trait.valueType === TraitValueType.ENUM) {
        const key = `${tv.traitId}::${String(tv.value).toLowerCase()}`;
        displayValue = enumValueMap.get(key) ?? String(tv.value);
      } else {
        displayValue = String(tv.value);
      }

      if (tv.clarifier) {
        displayValue = `${displayValue} (${tv.clarifier})`;
      }

      // For traits that allow multiple values, append rather than overwrite
      const existingKey = trait.name;
      if (result[existingKey]) {
        result[existingKey] = `${result[existingKey]}, ${displayValue}`;
      } else {
        result[existingKey] = displayValue;
      }
    }

    return result;
  }

  /**
   * Update character profile fields (name, details, visibility, trade settings, etc.).
   * Permission checking is handled by the guard - this method trusts the caller.
   */
  async updateProfile(
    id: string,
    userId: string,
    input: {
      characterData: Prisma.CharacterUpdateInput;
      tags?: string[];
      pendingOwner?: PendingOwnerInput | null;
      ownerId?: string | null;
    },
  ) {
    const character = await this.findOne(id, userId);
    const { characterData, tags, pendingOwner, ownerId } = input;

    // Update the character
    const updatedCharacter = await this.db.character.update({
      where: { id },
      data: characterData,
    });

    // Handle tags if provided
    if (tags !== undefined) {
      // Remove all existing character-tag relationships
      await this.db.characterTag.deleteMany({
        where: { characterId: id },
      });

      // Add new tags if provided
      if (tags.length > 0) {
        const tagModels = await this.tagsService.findOrCreateTags(tags);

        for (const tag of tagModels) {
          await this.db.characterTag.create({
            data: {
              characterId: id,
              tagId: tag.id,
            },
          });
        }
      }
    }

    // Handle ownership changes (if ownerId is being modified)
    if (ownerId !== undefined) {
      const oldOwnerId = character.ownerId;

      // Only update if ownership is actually changing
      if (oldOwnerId !== ownerId) {
        // Verify new owner exists if setting to a user
        if (ownerId !== null) {
          const newOwner = await this.db.user.findUnique({
            where: { id: ownerId },
          });
          if (!newOwner) {
            throw new NotFoundException("New owner not found");
          }
        }

        // Update character ownership
        await this.db.character.update({
          where: { id },
          data: { ownerId },
        });

        // Create ownership change audit record (only when transferring to a user)
        if (ownerId !== null) {
          await this.db.characterOwnershipChange.create({
            data: {
              characterId: id,
              fromUserId: oldOwnerId,
              toUserId: ownerId,
            },
          });
        }

        // If setting an actual owner, clear any pending ownership
        if (ownerId !== null) {
          const existingPending =
            await this.pendingOwnershipService.findByCharacterId(id);
          if (existingPending) {
            await this.pendingOwnershipService.remove(existingPending.id);
          }
        }
      }
    }

    // Handle pending ownership updates
    if (pendingOwner !== undefined) {
      // Get existing pending ownership
      const existingPending =
        await this.pendingOwnershipService.findByCharacterId(id);

      if (pendingOwner === null) {
        // Clear pending ownership
        if (existingPending) {
          await this.pendingOwnershipService.remove(existingPending.id);
        }
      } else {
        // Set or update pending ownership
        const { provider, providerAccountId } = pendingOwner;

        // Ensure character has a species
        if (!updatedCharacter.speciesId) {
          throw new BadRequestException(
            "Cannot set pending ownership on a character without a species",
          );
        }

        let resolvedAccountId = providerAccountId;
        let displayIdentifier: string | undefined;

        // Resolve Discord username to ID if necessary
        if (provider === ExternalAccountProvider.DISCORD) {
          const isNumericId = /^\d{17,19}$/.test(providerAccountId);
          if (!isNumericId) {
            displayIdentifier = providerAccountId;
          }
          resolvedAccountId = await this.resolveDiscordIdentifier(
            updatedCharacter.speciesId,
            providerAccountId,
          );
        } else if (provider === ExternalAccountProvider.DEVIANTART) {
          // DeviantArt uses usernames in the UI, but OAuth stores UUIDs.
          // Resolve the username to a UUID so it matches external_accounts.
          const resolved =
            await this.deviantArtService.resolveUsername(providerAccountId);
          resolvedAccountId = resolved.uuid;
          displayIdentifier = resolved.username;
        }

        // Remove old pending ownership if exists
        if (existingPending) {
          await this.pendingOwnershipService.remove(existingPending.id);
        }

        // Create new pending ownership (with auto-claim if account is already linked)
        await this.pendingOwnershipService.createForCharacter(
          id,
          provider,
          resolvedAccountId,
          displayIdentifier,
        );
      }
    }

    // Return the updated character (re-fetch to get latest state)
    const finalCharacter = await this.db.character.findUnique({
      where: { id },
    });
    if (!finalCharacter) {
      throw new NotFoundException("Character not found after update");
    }
    return finalCharacter;
  }

  /**
   * Update character registry fields (registryId, speciesVariant, traitValues).
   * Permission checking is handled by the guard - this method trusts the caller.
   */
  async updateRegistry(
    id: string,
    userId: string,
    input: {
      characterData: Prisma.CharacterUpdateInput;
      /** Staff's note on a variant change. Ignored when none happens. */
      variantChangeReason?: string | null;
    },
  ) {
    const character = await this.findOne(id, userId);
    const { characterData } = input;

    // Registry edits require a species
    if (!character.speciesId) {
      throw new BadRequestException(
        "Cannot update registry fields on a character without a species",
      );
    }

    // A variant belongs to exactly one species, and this never checked that
    // it was *this* character's.
    //
    // Nothing else did either: the input accepts `speciesVariantId`, the
    // mapper turns it into a `connect`, and the guard only asks whether the
    // caller may edit registry fields at all. So anyone with registry rights
    // could put a character on a variant of an entirely different species --
    // which then decides its trait list, its display, and what an MYO or edit
    // kit grant matches against.
    const connectedVariantId = (
      characterData.speciesVariant as { connect?: { id?: string } } | undefined
    )?.connect?.id;

    if (connectedVariantId) {
      const variant = await this.db.speciesVariant.findUnique({
        where: { id: connectedVariantId },
        select: { speciesId: true },
      });
      if (!variant || variant.speciesId !== character.speciesId) {
        throw new BadRequestException(
          "That variant belongs to a different species",
        );
      }
    }

    // Is the variant actually moving? A form that posts every registry field
    // sends the current variant back unchanged on most saves, and that is not
    // a rarity change -- it should neither need staff rights nor write an
    // audit row.
    const variantIsChanging =
      characterData.speciesVariant !== undefined &&
      connectedVariantId !== character.speciesVariantId;

    if (variantIsChanging) {
      await this.assertCanChangeVariant(userId, character.speciesId);
    }

    // The variant the traits are being judged against: the one it is moving
    // to, or the one it already has. Validating a Rare's markings against the
    // Common it used to be would refuse exactly the change staff came to make.
    const effectiveVariantId = variantIsChanging
      ? (connectedVariantId ?? null)
      : character.speciesVariantId;

    if (characterData.traitValues) {
      const traitValues =
        characterData.traitValues as PrismaJson.CharacterTraitValuesJson;
      if (Array.isArray(traitValues) && traitValues.length > 0) {
        await this.validateTraitValues(
          character.speciesId,
          traitValues,
          effectiveVariantId,
        );
      }
    }

    // The update and its audit row commit together or not at all. A rarity
    // change with no record of who made it is the thing this table exists to
    // stop.
    const updatedCharacter = await this.db.$transaction(async (tx) => {
      const updated = await tx.character.update({
        where: { id },
        data: characterData,
      });

      if (variantIsChanging) {
        await tx.characterVariantChange.create({
          data: {
            characterId: id,
            fromVariantId: character.speciesVariantId,
            toVariantId: connectedVariantId ?? null,
            changedById: userId,
            reason: input.variantChangeReason?.trim() || null,
            previousTraitValues:
              character.traitValues as PrismaJson.CharacterTraitValuesJson,
            newTraitValues:
              updated.traitValues as PrismaJson.CharacterTraitValuesJson,
          },
        });
      }

      return updated;
    });

    return updatedCharacter;
  }

  /**
   * Refuse a variant change from anyone but staff.
   *
   * Every other registry field is editable by an owner holding
   * `canEditOwnCharacterRegistry` -- their own registry id, their own traits.
   * Rarity is different in kind: it is the thing upgrade tickets are sold for,
   * so leaving it self-service gives away the product.
   *
   * The guard on the mutation cannot make this distinction. It asks whether
   * the caller may edit registry fields at all, and an owner with own-registry
   * rights passes -- which is how this has been reachable since the field was
   * added. So the check is here, on the one field it applies to.
   */
  private async assertCanChangeVariant(userId: string, speciesId: string) {
    const actor = await this.db.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    if (actor?.isAdmin) return;

    const species = await this.db.species.findUnique({
      where: { id: speciesId },
      select: { communityId: true },
    });
    if (!species) {
      throw new NotFoundException(`Species with ID ${speciesId} not found`);
    }

    const allowed = await this.permissionService.hasCommunityPermission(
      userId,
      species.communityId,
      CommunityPermission.CanEditCharacterRegistry,
    );
    if (!allowed) {
      throw new ForbiddenException(
        "Changing a character's variant is a staff action. Editing your own " +
          "character's registry does not include its rarity.",
      );
    }
  }

  /** A character's rarity history, newest first. */
  async findVariantChanges(characterId: string) {
    return this.db.characterVariantChange.findMany({
      where: { characterId },
      orderBy: { createdAt: "desc" },
      include: { fromVariant: true, toVariant: true, changedBy: true },
    });
  }

  /**
   * Refuse unless this user may create characters in the species' community.
   *
   * `createCharacter` has carried `@AllowCommunityPermission(CanCreateCharacter)`
   * since it was written, but that decorator sits beside `@AllowAnyAuthenticated`
   * and the two are OR'd -- so until this, any logged-in user could create a
   * character in any species. The frontend's SpeciesSelector filters by the
   * permission, which is why it went unnoticed: the hole was only reachable
   * through the API.
   *
   * The check belongs here rather than in a rearranged decorator because
   * {@link assignSpecies} already does it here, for the same permission and
   * the same reason -- attaching a species to an existing character is the
   * same act, done later. One of the two paths enforcing it and not the other
   * is how the gap survived.
   *
   * Global admins pass. The DA import runs as one and is not necessarily a
   * member of the community it imports into, and `@AllowGlobalAdmin` is how
   * every comparable mutation says the same thing.
   */
  private async assertCanCreateForSpecies(userId: string, speciesId: string) {
    const actor = await this.db.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    if (actor?.isAdmin) return;

    const species = await this.db.species.findUnique({
      where: { id: speciesId },
      select: { communityId: true },
    });
    if (!species) {
      throw new NotFoundException(`Species with ID ${speciesId} not found`);
    }

    const hasPermission = await this.permissionService.hasCommunityPermission(
      userId,
      species.communityId,
      CommunityPermission.CanCreateCharacter,
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        "You do not have permission to create characters for this species",
      );
    }
  }

  /**
   * Assign a species to a character for the first time.
   * This is only valid for characters that don't already have a species assigned.
   * The guard ensures the user can access the character; this method checks
   * canCreateCharacter permission for the target species.
   */
  async assignSpecies(
    id: string,
    userId: string,
    input: {
      speciesId: string;
      speciesVariantId?: string;
      registryId?: string;
      traitValues?: PrismaJson.CharacterTraitValuesJson;
    },
  ) {
    const character = await this.findOne(id, userId);

    // Cannot assign species if character already has one
    if (character.speciesId) {
      throw new BadRequestException(
        "Character already has a species assigned. Species cannot be changed once set.",
      );
    }

    // Verify the species exists and get its community
    const species = await this.db.species.findUnique({
      where: { id: input.speciesId },
      select: { id: true, communityId: true },
    });
    if (!species) {
      throw new NotFoundException(
        `Species with ID ${input.speciesId} not found`,
      );
    }

    // Verify user has canCreateCharacter permission for the target species
    const hasPermission = await this.permissionService.hasCommunityPermission(
      userId,
      species.communityId,
      CommunityPermission.CanCreateCharacter,
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        "You do not have permission to create characters for this species",
      );
    }

    // If variant provided, verify it belongs to the species
    if (input.speciesVariantId) {
      const variant = await this.db.speciesVariant.findFirst({
        where: {
          id: input.speciesVariantId,
          speciesId: input.speciesId,
        },
      });
      if (!variant) {
        throw new BadRequestException(
          "Species variant does not belong to the specified species",
        );
      }
    }

    // Validate trait values if provided
    if (input.traitValues && input.traitValues.length > 0) {
      await this.validateTraitValues(input.speciesId, input.traitValues);
    }

    // Update the character with species assignment
    const updatedCharacter = await this.db.character.update({
      where: { id },
      data: {
        speciesId: input.speciesId,
        speciesVariantId: input.speciesVariantId,
        registryId: input.registryId,
        traitValues: input.traitValues ?? [],
      },
    });

    return updatedCharacter;
  }

  /**
   * Validates that the user has permission to edit the specified fields.
   * Profile fields require canEditOwnCharacter (for owners) or canEditCharacter.
   * Registry fields require canEditOwnCharacterRegistry (for owners) or canEditCharacterRegistry.
   */
  async validateFieldPermissions(
    userId: string,
    character: { ownerId: string | null; speciesId: string | null },
    characterData: Prisma.CharacterUpdateInput,
    tags: string[] | undefined,
    communityId: string,
  ): Promise<void> {
    const isOwner = character.ownerId === userId;
    const permissions = await this.permissionService.getCommunityPermissions(
      userId,
      communityId,
    );

    // Determine which facets the user can edit
    const canEditProfile = isOwner
      ? permissions.canEditOwnCharacter || permissions.canEditCharacter
      : permissions.canEditCharacter;
    const canEditRegistry = isOwner
      ? permissions.canEditOwnCharacterRegistry ||
        permissions.canEditCharacterRegistry
      : permissions.canEditCharacterRegistry;

    // Check for profile field violations
    const profileFieldsInInput = Object.keys(characterData).filter((k) =>
      PROFILE_FIELDS.has(k),
    );
    // Tags are profile-level (handled separately from characterData)
    if (tags !== undefined) {
      profileFieldsInInput.push("tags");
    }

    if (profileFieldsInInput.length > 0 && !canEditProfile) {
      throw new ForbiddenException(
        `You do not have permission to edit profile fields (${profileFieldsInInput.join(", ")}). ` +
          `You need the "${isOwner ? "Edit Own Characters" : "Edit Any Character"}" permission.`,
      );
    }

    // Check for registry field violations
    const registryFieldsInInput = Object.keys(characterData).filter((k) =>
      REGISTRY_FIELDS.has(k),
    );

    if (registryFieldsInInput.length > 0 && !canEditRegistry) {
      throw new ForbiddenException(
        `You do not have permission to edit registry fields (${registryFieldsInInput.join(", ")}). ` +
          `Registry fields like species variant and traits require admin permission. ` +
          `Contact a species admin to modify these fields.`,
      );
    }
  }

  async transfer(
    id: string,
    currentOwnerId: string | null,
    newOwnerId: string,
  ) {
    // For orphaned characters, currentOwnerId can be null
    const character = currentOwnerId
      ? await this.findOne(id, currentOwnerId)
      : await this.db.character.findFirst({ where: { id, ...notDeleted } });

    if (!character) {
      throw new NotFoundException("Character not found");
    }

    // Check ownership (allow transfer from null for orphaned characters)
    if (character.ownerId !== currentOwnerId) {
      throw new ForbiddenException("You can only transfer your own characters");
    }

    // Verify new owner exists
    const newOwner = await this.db.user.findUnique({
      where: { id: newOwnerId },
    });

    if (!newOwner) {
      throw new NotFoundException("New owner not found");
    }

    // Update character ownership and create ownership change record
    const transferredCharacter = await this.db.character.update({
      where: { id },
      data: {
        ownerId: newOwnerId,
        // Keep original creator
      },
    });

    // Create ownership change record
    await this.db.characterOwnershipChange.create({
      data: {
        characterId: id,
        fromUserId: currentOwnerId, // Can be null for orphaned characters
        toUserId: newOwnerId,
      },
    });

    return transferredCharacter;
  }

  async addTags(characterId: string, userId: string, tagNames: string[]) {
    const character = await this.db.character.findFirst({
      where: { id: characterId, ...notDeleted },
    });

    if (!character) {
      throw new NotFoundException("Character not found");
    }

    // Create tags if they don't exist and connect them
    const tags = await this.tagsService.findOrCreateTags(tagNames);

    for (const tag of tags) {
      await this.db.characterTag.upsert({
        where: {
          characterId_tagId: {
            characterId,
            tagId: tag.id,
          },
        },
        create: {
          characterId,
          tagId: tag.id,
        },
        update: {},
      });
    }

    return character;
  }

  async removeTags(characterId: string, userId: string, tagNames: string[]) {
    const character = await this.db.character.findFirst({
      where: { id: characterId, ...notDeleted },
    });

    if (!character) {
      throw new NotFoundException("Character not found");
    }

    // Remove tag connections
    await this.db.characterTag.deleteMany({
      where: {
        characterId,
        tag: {
          name: { in: tagNames.map((name) => name.toLowerCase()) },
        },
      },
    });

    return character;
  }

  /**
   * Sets or clears the main media for a character
   * @param characterId ID of the character to update
   * @param userId ID of the user making the request (must be character owner)
   * @param mediaId Media ID to set as main, or undefined to clear
   * @returns Updated character with new main media
   * @throws ForbiddenException if user doesn't own the character or media doesn't belong to character
   * @throws NotFoundException if media doesn't exist
   */
  async setMainMedia(characterId: string, userId: string, mediaId?: string) {
    const character = await this.db.character.findFirst({
      where: { id: characterId, ...notDeleted },
    });

    if (!character) {
      throw new NotFoundException("Character not found");
    }

    // If mediaId is provided, verify the media exists and belongs to this character
    if (mediaId) {
      const media = await this.db.media.findUnique({
        where: { id: mediaId },
      });

      if (!media) {
        throw new NotFoundException("Media not found");
      }

      if (media.characterId !== characterId) {
        throw new ForbiddenException("Media must belong to this character");
      }
    }

    // Update character with new main media (or null to clear)
    const updatedCharacter = await this.db.character.update({
      where: { id: characterId },
      data: { mainMediaId: mediaId },
    });

    return updatedCharacter;
  }

  private buildSearchConditions(
    search: string,
    searchFields: string,
  ): Prisma.CharacterWhereInput[] {
    const searchTerm = { contains: search, mode: "insensitive" as const };

    switch (searchFields) {
      case "name":
        return [{ name: searchTerm }];
      case "details":
        return [{ details: searchTerm }];
      default: // 'all'
        return [
          { name: searchTerm },
          { details: searchTerm },
          { species: { name: searchTerm } },
        ];
    }
  }

  private buildOrderBy(
    sortBy: string,
    sortOrder: string,
  ): Prisma.CharacterOrderByWithRelationInput {
    const order = sortOrder === "asc" ? "asc" : "desc";

    switch (sortBy) {
      case "name":
        return { name: order } as const;
      case "updated":
        return { updatedAt: order } as const;
      case "price":
        return { price: order } as const;
      default: // 'created'
        return { createdAt: order } as const;
    }
  }

  /**
   * Validates that trait values respect the allowsMultipleValues constraint
   * @param speciesId The species ID to fetch traits for
   * @param traitValues The trait values to validate
   * @throws BadRequestException if any single-value trait has multiple values
   */
  /** Public for MYO redemption, which creates its character on its own transaction. */
  async validateTraitValues(
    speciesId: string,
    traitValues: PrismaJson.CharacterTraitValuesJson,
    speciesVariantId?: string | null,
  ) {
    // Fetch all traits for this species
    const traits = await this.db.trait.findMany({
      where: { speciesId },
      select: {
        id: true,
        name: true,
        allowsMultipleValues: true,
        allowsClarifier: true,
      },
    });

    // Build a map of traitId -> trait info
    const traitMap = new Map(
      traits.map((t) => [
        t.id,
        {
          name: t.name,
          allowsMultipleValues: t.allowsMultipleValues,
          allowsClarifier: t.allowsClarifier,
        },
      ]),
    );

    // Group trait values by traitId and count occurrences
    const traitValueCounts = new Map<
      string,
      { count: number; values: string[] }
    >();

    const violations: string[] = [];

    for (const tv of traitValues) {
      if (!traitValueCounts.has(tv.traitId)) {
        traitValueCounts.set(tv.traitId, { count: 0, values: [] });
      }
      const entry = traitValueCounts.get(tv.traitId)!;
      entry.count++;
      // Convert value to string for display in error messages
      entry.values.push(String(tv.value));

      // Per-entry validation for clarifier
      const clarifier = tv.clarifier;
      if (clarifier !== undefined && clarifier !== null && clarifier !== "") {
        const traitInfo = traitMap.get(tv.traitId);
        if (traitInfo && !traitInfo.allowsClarifier) {
          violations.push(
            `Trait '${traitInfo.name}' does not allow clarifier text`,
          );
        }
        if (typeof clarifier !== "string") {
          violations.push(
            `Clarifier for trait '${traitInfo?.name ?? tv.traitId}' must be a string`,
          );
        } else if (clarifier.length > 200) {
          violations.push(
            `Clarifier for trait '${traitInfo?.name ?? tv.traitId}' exceeds 200 characters`,
          );
        }
        if (tv.value === null || tv.value === undefined || tv.value === "") {
          violations.push(
            `Clarifier for trait '${traitInfo?.name ?? tv.traitId}' requires a value`,
          );
        }
      }
    }

    // Check for multi-value violations
    for (const [traitId, { count, values }] of traitValueCounts.entries()) {
      const traitInfo = traitMap.get(traitId);

      if (!traitInfo) {
        // Trait doesn't exist for this species
        violations.push(
          `Trait with ID '${traitId}' does not exist for this species`,
        );
        continue;
      }

      if (!traitInfo.allowsMultipleValues && count > 1) {
        violations.push(
          `Trait '${traitInfo.name}' does not allow multiple values. Found ${count} values: ${values.map((v) => `'${v}'`).join(", ")}`,
        );
      }
    }

    if (speciesVariantId) {
      violations.push(
        ...(await this.enumValueViolationsForVariant(
          traitValues,
          speciesVariantId,
        )),
      );
    }

    if (violations.length > 0) {
      throw new BadRequestException(
        `Trait validation failed:\n${violations.join("\n")}`,
      );
    }
  }

  /**
   * Enum values this variant does not permit.
   *
   * `EnumValueSetting` is an allow-list per variant: a row says "this variant
   * may use this option". Rarity is usually what it encodes -- a Rare may take
   * markings a Common may not.
   *
   * **A variant with no rows at all permits everything.** That is the
   * difference between *unconfigured* and *empty*, and reading it the other
   * way would refuse every save in every community that uses variants without
   * ever setting this up -- which is most of them, and which is why nothing
   * validated this before. Only a variant somebody has actually configured
   * constrains anything.
   *
   * Scoped to enum traits. A free-text or numeric trait has no options to
   * allow, so it has no settings and must not be read as forbidden.
   */
  private async enumValueViolationsForVariant(
    traitValues: PrismaJson.CharacterTraitValuesJson,
    speciesVariantId: string,
  ): Promise<string[]> {
    const settings = await this.db.enumValueSetting.findMany({
      where: { speciesVariantId },
      select: { enumValueId: true },
    });
    if (settings.length === 0) return [];

    const allowed = new Set(settings.map((s) => s.enumValueId));

    // Only enum traits are constrained, and only the values that name an enum
    // option. A value that is not an enum option at all belongs to a text or
    // numeric trait and is none of this rule's business.
    // Only string values can name an enum option; a numeric or boolean trait
    // value is not an id and must not be looked up as one.
    const candidateIds = traitValues
      .map((tv) => tv.value)
      .filter((v): v is string => typeof v === "string");
    if (candidateIds.length === 0) return [];

    const enumValues = await this.db.enumValue.findMany({
      where: { id: { in: candidateIds } },
      select: {
        id: true,
        name: true,
        trait: { select: { name: true } },
      },
    });

    const variant = await this.db.speciesVariant.findUnique({
      where: { id: speciesVariantId },
      select: { name: true },
    });

    return enumValues
      .filter((ev) => !allowed.has(ev.id))
      .map(
        (ev) =>
          `'${ev.name}' is not available to ${variant?.name ?? "this variant"}` +
          ` for trait '${ev.trait.name}'`,
      );
  }

  async getLikesCount(characterId: string) {
    return this.db.like.count({
      where: { characterId },
    });
  }

  async hasUserLiked(characterId: string, userId: string) {
    const like = await this.db.like.findUnique({
      where: {
        userId_characterId: {
          userId,
          characterId,
        },
      },
    });
    return !!like;
  }

  /**
   * Check if a user has permission to create orphaned characters in a species' community
   */
  async userHasOrphanedCharacterPermission(
    userId: string,
    speciesId: string,
  ): Promise<boolean> {
    // Get the community for this species
    const species = await this.db.species.findUnique({
      where: { id: speciesId },
      include: { community: true },
    });

    if (!species) {
      return false;
    }

    // Check if user has a role with canCreateOrphanedCharacter permission
    const membership = await this.db.communityMember.findFirst({
      where: {
        userId,
        role: {
          communityId: species.communityId,
          canCreateOrphanedCharacter: true,
        },
      },
    });

    return !!membership;
  }

  /**
   * Resolve a Discord identifier (username or ID) to a Discord user ID
   * @param speciesId The species ID to get the community from
   * @param identifier The Discord username or user ID
   * @returns The Discord user ID
   * @throws BadRequestException if guild not connected or username not found
   */
  private async resolveDiscordIdentifier(
    speciesId: string,
    identifier: string,
  ): Promise<string> {
    // Check if identifier is already a numeric ID (18-19 digits)
    if (/^\d{17,19}$/.test(identifier)) {
      // Validate the numeric ID exists in Discord
      const isValid = await this.discordService.validateUserId(identifier);
      if (!isValid) {
        throw new NotFoundException(
          `Discord user with ID "${identifier}" not found. Please verify the ID is correct.`,
        );
      }
      return identifier;
    }

    // It's a username - need to resolve it
    // First get the species to find the community
    const species = await this.db.species.findUnique({
      where: { id: speciesId },
      select: {
        communityId: true,
        community: {
          select: {
            discordGuildId: true,
            name: true,
          },
        },
      },
    });

    if (!species) {
      throw new NotFoundException(`Species with ID ${speciesId} not found`);
    }

    if (!species.community.discordGuildId) {
      throw new BadRequestException(
        `Cannot use Discord username: Community "${species.community.name}" has no Discord server connected. Please use numeric Discord User ID or ask an admin to connect the Discord server.`,
      );
    }

    // Resolve username to ID
    const userId = await this.discordService.resolveUsernameToId(
      species.community.discordGuildId,
      identifier,
    );

    if (!userId) {
      throw new NotFoundException(
        `Discord user "${identifier}" not found in community's Discord server`,
      );
    }

    return userId;
  }
}
