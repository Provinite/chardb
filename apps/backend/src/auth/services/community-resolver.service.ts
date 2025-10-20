import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import {
  CommunityResolutionConfig,
  CommunityResolutionReference,
} from "../types/CommunityResolutionConfig";
import { Community } from "@chardb/database";
import { MaybePromise } from "@opentelemetry/resources";

/**
 * Service for resolving which community an entity belongs to.
 *
 * Many permission checks require knowing the community context, but the communityId
 * isn't always directly available in mutation/query arguments. This service handles
 * resolving the community through entity relationships.
 *
 * Entity → Community Resolution Paths:
 * - Character → Species → Community (or null if no species)
 * - Species → Community (direct)
 * - SpeciesVariant → Species → Community
 * - Trait → Species → Community
 * - EnumValue → Trait → Species → Community
 * - EnumValueSetting → SpeciesVariant → Species → Community
 * - TraitListEntry → SpeciesVariant → Species → Community
 * - CommunityMember → Role → Community
 * - CommunityInvitation → Community (direct)
 * - Role → Community (direct)
 */
@Injectable()
export class CommunityResolverService {
  constructor(private prisma: DatabaseService) {}

  /**
   * Get the community ID for a character.
   *
   * Characters can optionally belong to a species. If they have a species,
   * the community is resolved through: character → species → community.
   * If no species, returns null (use global permissions).
   *
   * @param characterId - The character ID
   * @returns The community ID or null if character has no species
   */
  async getCharacterCommunity(characterId: string): Promise<string | null> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: {
        species: {
          select: { communityId: true },
        },
      },
    });

    return character?.species?.communityId ?? null;
  }

  /**
   * Get the community ID for a species.
   *
   * @param speciesId - The species ID
   * @returns The community ID
   * @throws NotFoundException if species doesn't exist
   */
  async getSpeciesCommunity(speciesId: string): Promise<string> {
    const species = await this.prisma.species.findUnique({
      where: { id: speciesId },
      select: { communityId: true },
    });

    if (!species) {
      throw new Error(`Species with ID ${speciesId} not found`);
    }

    return species.communityId;
  }

  /**
   * Get the community ID for a species variant.
   *
   * Resolved through: variant → species → community
   *
   * @param variantId - The species variant ID
   * @returns The community ID
   * @throws NotFoundException if variant doesn't exist
   */
  async getSpeciesVariantCommunity(variantId: string): Promise<string> {
    const variant = await this.prisma.speciesVariant.findUnique({
      where: { id: variantId },
      select: {
        species: {
          select: { communityId: true },
        },
      },
    });

    if (!variant) {
      throw new Error(`SpeciesVariant with ID ${variantId} not found`);
    }

    return variant.species.communityId;
  }

  /**
   * Get the community ID for a trait.
   *
   * Resolved through: trait → species → community
   *
   * @param traitId - The trait ID
   * @returns The community ID
   * @throws NotFoundException if trait doesn't exist
   */
  async getTraitCommunity(traitId: string): Promise<string> {
    const trait = await this.prisma.trait.findUnique({
      where: { id: traitId },
      select: {
        species: {
          select: { communityId: true },
        },
      },
    });

    if (!trait) {
      throw new Error(`Trait with ID ${traitId} not found`);
    }

    return trait.species.communityId;
  }

  /**
   * Get the community ID for an enum value.
   *
   * Resolved through: enumValue → trait → species → community
   *
   * @param enumValueId - The enum value ID
   * @returns The community ID
   * @throws NotFoundException if enum value doesn't exist
   */
  async getEnumValueCommunity(enumValueId: string): Promise<string> {
    const enumValue = await this.prisma.enumValue.findUnique({
      where: { id: enumValueId },
      select: {
        trait: {
          select: {
            species: {
              select: { communityId: true },
            },
          },
        },
      },
    });

    if (!enumValue) {
      throw new Error(`EnumValue with ID ${enumValueId} not found`);
    }

    return enumValue.trait.species.communityId;
  }

  /**
   * Get the community ID for an enum value setting.
   *
   * Resolved through: setting → speciesVariant → species → community
   *
   * @param settingId - The enum value setting ID
   * @returns The community ID
   * @throws NotFoundException if setting doesn't exist
   */
  async getEnumValueSettingCommunity(settingId: string): Promise<string> {
    const setting = await this.prisma.enumValueSetting.findUnique({
      where: { id: settingId },
      select: {
        speciesVariant: {
          select: {
            species: {
              select: { communityId: true },
            },
          },
        },
      },
    });

    if (!setting) {
      throw new Error(`EnumValueSetting with ID ${settingId} not found`);
    }

    return setting.speciesVariant.species.communityId;
  }

  /**
   * Get the community ID for a trait list entry.
   *
   * Resolved through: entry → speciesVariant → species → community
   *
   * @param entryId - The trait list entry ID
   * @returns The community ID
   * @throws NotFoundException if entry doesn't exist
   */
  async getTraitListEntryCommunity(entryId: string): Promise<string> {
    const entry = await this.prisma.traitListEntry.findUnique({
      where: { id: entryId },
      select: {
        speciesVariant: {
          select: {
            species: {
              select: { communityId: true },
            },
          },
        },
      },
    });

    if (!entry) {
      throw new Error(`TraitListEntry with ID ${entryId} not found`);
    }

    return entry.speciesVariant.species.communityId;
  }

  /**
   * Get the community ID for a community member.
   *
   * Resolved through: communityMember → role → community
   *
   * @param communityMemberId - The community member ID
   * @returns The community ID
   * @throws Error if community member doesn't exist
   */
  async getCommunityMemberCommunity(communityMemberId: string): Promise<string> {
    const communityMember = await this.prisma.communityMember.findUnique({
      where: { id: communityMemberId },
      select: {
        role: {
          select: { communityId: true },
        },
      },
    });

    if (!communityMember) {
      throw new Error(`CommunityMember with ID ${communityMemberId} not found`);
    }

    return communityMember.role.communityId;
  }

  /**
   * Get the community ID for a community invitation.
   *
   * Community invitations have a direct communityId field.
   *
   * @param communityInvitationId - The community invitation ID
   * @returns The community ID
   * @throws Error if community invitation doesn't exist
   */
  async getCommunityInvitationCommunity(communityInvitationId: string): Promise<string> {
    const communityInvitation = await this.prisma.communityInvitation.findUnique({
      where: { id: communityInvitationId },
      select: { communityId: true },
    });

    if (!communityInvitation) {
      throw new Error(`CommunityInvitation with ID ${communityInvitationId} not found`);
    }

    return communityInvitation.communityId;
  }

  /**
   * Get the community ID for a role.
   *
   * Roles have a direct communityId field.
   *
   * @param roleId - The role ID
   * @returns The community ID
   * @throws Error if role doesn't exist
   */
  async getRoleCommunity(roleId: string): Promise<string> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { communityId: true },
    });

    if (!role) {
      throw new Error(`Role with ID ${roleId} not found`);
    }

    return role.communityId;
  }

  /**
   * Get the community ID for an item type.
   *
   * ItemTypes have a direct communityId field.
   *
   * @param itemTypeId - The item type ID
   * @returns The community ID
   * @throws Error if item type doesn't exist
   */
  async getItemTypeCommunity(itemTypeId: string): Promise<string> {
    const itemType = await this.prisma.itemType.findUnique({
      where: { id: itemTypeId },
      select: { communityId: true },
    });

    if (!itemType) {
      throw new Error(`ItemType with ID ${itemTypeId} not found`);
    }

    return itemType.communityId;
  }

  /**
   * Get the community ID for an item.
   * Resolution path: item → itemType → community
   *
   * @param itemId - The item ID
   * @returns The community ID
   */
  async getItemCommunity(itemId: string): Promise<string> {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      select: {
        itemType: {
          select: { communityId: true },
        },
      },
    });

    if (!item) {
      throw new Error(`Item with ID ${itemId} not found`);
    }

    return item.itemType.communityId;
  }

  /**
   * Resolve the community for a given entity using resolution configuration.
   *
   * This is the primary method used by guards to determine community context.
   * It takes a configuration object specifying which entity ID to use for resolution,
   * and returns the associated Community entity.
   *
   * The method iterates through the config properties in order and uses the first
   * non-null value found. It then calls the appropriate lookup function to resolve
   * the community ID, and finally fetches the Community entity.
   *
   * @param config - Configuration object with entity IDs to resolve from.
   *                 Only one property needs to be set. The first non-null property
   *                 found will be used for resolution.
   *
   * @returns The Community entity if successfully resolved, null otherwise
   *
   * @example
   * ```typescript
   * // Resolve from a character ID
   * const community = await resolver.resolve({ characterId: 'char_123' });
   *
   * // Resolve from a species ID
   * const community = await resolver.resolve({ speciesId: 'species_456' });
   *
   * // Resolve from direct community ID
   * const community = await resolver.resolve({ communityId: 'comm_789' });
   * ```
   */
  async resolve(
    config: CommunityResolutionReference,
  ): Promise<Community | null> {
    const lookupFn: Record<
      keyof CommunityResolutionConfig,
      (id: string) => MaybePromise<string | null>
    > = {
      communityId: async (id: string) => id,
      characterId: this.getCharacterCommunity.bind(this),
      speciesId: this.getSpeciesCommunity.bind(this),
      speciesVariantId: this.getSpeciesVariantCommunity.bind(this),
      traitId: this.getTraitCommunity.bind(this),
      enumValueId: this.getEnumValueCommunity.bind(this),
      enumValueSettingId: this.getEnumValueSettingCommunity.bind(this),
      traitListEntryId: this.getTraitListEntryCommunity.bind(this),
      communityMemberId: this.getCommunityMemberCommunity.bind(this),
      communityInvitationId: this.getCommunityInvitationCommunity.bind(this),
      roleId: this.getRoleCommunity.bind(this),
      itemTypeId: this.getItemTypeCommunity.bind(this),
      itemId: this.getItemCommunity.bind(this),
    };

    if (!config.type) {
      return null;
    }

    const communityId = await lookupFn[config.type](config.value);

    if (communityId) {
      return this.prisma.community.findUnique({
        where: {
          id: communityId,
        },
      });
    }

    return null;
  }
}
