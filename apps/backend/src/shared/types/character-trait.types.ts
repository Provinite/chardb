import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType({ description: 'A trait value assigned to a character' })
export class CharacterTraitValue {
  /** The ID of the trait this value belongs to */
  @Field(() => ID, { description: 'The ID of the trait this value belongs to' })
  traitId!: string;

  /** The value of the trait (can be string, number, boolean, or null) */
  @Field(() => String, { description: 'The value of the trait', nullable: true })
  value!: string | number | boolean | null;
}

/** Type alias for the Prisma generated JSON type */
export type CharacterTraitValuesJson = PrismaJson.CharacterTraitValuesJson;