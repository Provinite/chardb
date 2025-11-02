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
import { Prisma, Visibility, ExternalAccountProvider } from "@chardb/database";

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
  tags?: string[];
  ownerId?: string;
  visibility?: Visibility;
  isSellable?: boolean;
  isTradeable?: boolean;
  gender?: string;
  ageRange?: string;
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
  ) {}

  async create(
    userId: string,
    input: {
      characterData: Omit<Prisma.CharacterCreateInput, "owner" | "creator">;
      tags?: string[];
      pendingOwner?: PendingOwnerInput; // Pending ownership info
    },
  ) {
    const { characterData, tags, pendingOwner } = input;

    // Determine the actual owner:
    // - If pendingOwner is provided, character is orphaned (ownerId = null)
    // - Otherwise, owner is the current user (userId)
    const actualOwnerId = pendingOwner ? null : userId;

    // Validate trait values if species and trait values are provided
    const speciesId = characterData.species?.connect?.id;
    const traitValues = characterData.traitValues;

    if (
      speciesId &&
      traitValues &&
      Array.isArray(traitValues) &&
      traitValues.length > 0
    ) {
      await this.validateTraitValues(speciesId, traitValues);
    }

    const character = await this.db.character.create({
      data: {
        // Owner connection (may be null for orphaned characters)
        ...(actualOwnerId ? { owner: { connect: { id: actualOwnerId } } } : {}),
        // Creator is always the user creating the character
        creator: {
          connect: { id: userId },
        },
        ...characterData,
      },
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

    // Create pending ownership record if provided
    if (pendingOwner && speciesId) {
      let resolvedAccountId = pendingOwner.providerAccountId;
      let displayIdentifier: string | undefined;

      // Resolve Discord username to ID if necessary
      if (pendingOwner.provider === ExternalAccountProvider.DISCORD) {
        // Check if the input is already a numeric ID
        const isNumericId = /^\d{17,19}$/.test(pendingOwner.providerAccountId);

        // If it's not an ID (i.e., it's a username), store it as displayIdentifier
        if (!isNumericId) {
          displayIdentifier = pendingOwner.providerAccountId;
        }

        resolvedAccountId = await this.resolveDiscordIdentifier(
          speciesId,
          pendingOwner.providerAccountId,
        );
      } else if (pendingOwner.provider === ExternalAccountProvider.DEVIANTART) {
        // DeviantArt uses usernames, so always store as displayIdentifier
        displayIdentifier = pendingOwner.providerAccountId;
      }

      await this.pendingOwnershipService.createForCharacter(
        character.id,
        pendingOwner.provider,
        resolvedAccountId,
        displayIdentifier,
      );
    }

    // Return the created character
    return character;
  }

  async findAll(filters: CharacterServiceFilters = {}, userId?: string) {
    const {
      limit = 20,
      offset = 0,
      search,
      species,
      speciesId,
      speciesVariantId,
      tags,
      ownerId,
      visibility,
      isSellable,
      isTradeable,
      gender,
      ageRange,
      minPrice,
      maxPrice,
      sortBy = "created",
      sortOrder = "desc",
      searchFields = "all",
    } = filters;

    const where: Prisma.CharacterWhereInput = {
      AND: [
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
        gender ? { gender: { contains: gender, mode: "insensitive" } } : {},
        ageRange ? { age: { contains: ageRange, mode: "insensitive" } } : {},
        ownerId ? { ownerId } : {},
        visibility !== undefined ? { visibility } : {},
        isSellable !== undefined ? { isSellable } : {},
        isTradeable !== undefined ? { isTradeable } : {},

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

  async findOne(id: string, userId?: string) {
    const character = await this.db.character.findUnique({
      where: { id },
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
    input: { characterData: Prisma.CharacterUpdateInput; tags?: string[] },
  ) {
    const character = await this.findOne(id, userId);

    const { characterData, tags } = input;

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

    // Return the updated character
    return updatedCharacter;
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const character = await this.findOne(id, userId);

    await this.db.character.delete({
      where: { id },
    });

    return true;
  }

  async transfer(
    id: string,
    currentOwnerId: string | null,
    newOwnerId: string,
  ) {
    // For orphaned characters, currentOwnerId can be null
    const character = currentOwnerId
      ? await this.findOne(id, currentOwnerId)
      : await this.db.character.findUnique({ where: { id } });

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
    const character = await this.db.character.findUnique({
      where: { id: characterId },
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
    const character = await this.db.character.findUnique({
      where: { id: characterId },
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
    const character = await this.db.character.findUnique({
      where: { id: characterId },
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

  private buildSearchConditions(search: string, searchFields: string) {
    const searchTerm = { contains: search, mode: "insensitive" as const };

    switch (searchFields) {
      case "name":
        return [{ name: searchTerm }];
      case "description":
        return [{ description: searchTerm }];
      case "personality":
        return [{ personality: searchTerm }];
      case "backstory":
        return [{ backstory: searchTerm }];
      default: // 'all'
        return [
          { name: searchTerm },
          { description: searchTerm },
          { personality: searchTerm },
          { backstory: searchTerm },
          { species: { name: searchTerm } },
        ];
    }
  }

  private buildOrderBy(sortBy: string, sortOrder: string) {
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
  private async validateTraitValues(
    speciesId: string,
    traitValues: PrismaJson.CharacterTraitValuesJson,
  ) {
    // Fetch all traits for this species
    const traits = await this.db.trait.findMany({
      where: { speciesId },
      select: {
        id: true,
        name: true,
        allowsMultipleValues: true,
      },
    });

    // Build a map of traitId -> trait info
    const traitMap = new Map(
      traits.map((t) => [
        t.id,
        { name: t.name, allowsMultipleValues: t.allowsMultipleValues },
      ]),
    );

    // Group trait values by traitId and count occurrences
    const traitValueCounts = new Map<
      string,
      { count: number; values: string[] }
    >();

    for (const tv of traitValues) {
      if (!traitValueCounts.has(tv.traitId)) {
        traitValueCounts.set(tv.traitId, { count: 0, values: [] });
      }
      const entry = traitValueCounts.get(tv.traitId)!;
      entry.count++;
      // Convert value to string for display in error messages
      entry.values.push(String(tv.value));
    }

    // Check for violations
    const violations: string[] = [];
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

    if (violations.length > 0) {
      throw new BadRequestException(
        `Trait validation failed:\n${violations.join("\n")}`,
      );
    }
  }

  /** Update character trait values */
  async updateTraits(
    id: string,
    updateData: { traitValues: PrismaJson.CharacterTraitValuesJson },
    userId: string,
  ) {
    // Fetch character to validate species
    const character = await this.db.character.findUnique({
      where: { id },
      select: { speciesId: true },
    });

    if (!character) {
      throw new NotFoundException(`Character with ID ${id} not found`);
    }

    // Validate trait values if character has a species
    if (character.speciesId && updateData.traitValues.length > 0) {
      await this.validateTraitValues(
        character.speciesId,
        updateData.traitValues,
      );
    }

    // Update the character with new trait values
    return this.db.character.update({
      where: { id },
      data: {
        traitValues: updateData.traitValues,
      },
    });
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
