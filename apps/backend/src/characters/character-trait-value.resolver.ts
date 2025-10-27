import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { AllowUnauthenticated } from '../auth/decorators/AllowUnauthenticated';
import { CharacterTraitValue } from '../shared/types/character-trait.types';
import { Trait } from '../traits/entities/trait.entity';
import { EnumValue } from '../enum-values/entities/enum-value.entity';
import { TraitsService } from '../traits/traits.service';
import { EnumValuesService } from '../enum-values/enum-values.service';
import { mapPrismaTraitToGraphQL } from '../traits/utils/trait-resolver-mappers';
import { mapPrismaEnumValueToGraphQL } from '../enum-values/utils/enum-value-resolver-mappers';

/**
 * Resolver for CharacterTraitValue field resolvers
 *
 * Provides nested resolution for trait metadata and enum value names
 * to enable rich trait display on character pages.
 */
@Resolver(() => CharacterTraitValue)
export class CharacterTraitValueResolver {
  constructor(
    private readonly traitsService: TraitsService,
    private readonly enumValuesService: EnumValuesService,
  ) {}

  /**
   * Resolves the full trait definition for a trait value
   * Allows querying trait name, type, and other metadata
   */
  @AllowUnauthenticated()
  @ResolveField('trait', () => Trait, { nullable: true })
  async resolveTrait(
    @Parent() traitValue: CharacterTraitValue,
  ): Promise<Trait | null> {
    try {
      const prismaTrait = await this.traitsService.findOne(traitValue.traitId);
      return mapPrismaTraitToGraphQL(prismaTrait);
    } catch (error) {
      // Trait not found or deleted
      return null;
    }
  }

  /**
   * Resolves the enum value entity for ENUM-type traits
   * Returns null for non-ENUM traits or if value is not a valid enum value ID
   */
  @AllowUnauthenticated()
  @ResolveField('enumValue', () => EnumValue, { nullable: true })
  async resolveEnumValue(
    @Parent() traitValue: CharacterTraitValue,
  ): Promise<EnumValue | null> {
    // Only resolve for string values (enum value IDs are UUIDs)
    if (typeof traitValue.value !== 'string') {
      return null;
    }

    try {
      // Attempt to fetch the enum value
      const prismaEnumValue = await this.enumValuesService.findOne(traitValue.value);
      return mapPrismaEnumValueToGraphQL(prismaEnumValue);
    } catch (error) {
      // Not an enum value ID, or enum value deleted
      return null;
    }
  }
}
