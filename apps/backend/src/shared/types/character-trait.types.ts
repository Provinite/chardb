import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Trait } from '../../traits/entities/trait.entity';
import { EnumValue } from '../../enum-values/entities/enum-value.entity';

@ObjectType({ description: 'A trait value assigned to a character' })
export class CharacterTraitValue {
  /** The ID of the trait this value belongs to */
  @Field(() => ID, { description: 'The ID of the trait this value belongs to' })
  traitId!: string;

  /** The value of the trait (can be string, number, boolean, or null) */
  @Field(() => String, { description: 'The value of the trait', nullable: true })
  value!: string | number | boolean | null;

  /** The full trait definition (resolved via field resolver) */
  @Field(() => Trait, { nullable: true, description: 'The full trait definition' })
  trait?: Trait;

  /** For ENUM-type traits, the resolved enum value (resolved via field resolver) */
  @Field(() => EnumValue, { nullable: true, description: 'For ENUM-type traits, the resolved enum value' })
  enumValue?: EnumValue;
}

/** Type alias for the Prisma generated JSON type */
export type CharacterTraitValuesJson = PrismaJson.CharacterTraitValuesJson;