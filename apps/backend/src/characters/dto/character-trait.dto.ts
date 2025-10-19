import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID, IsOptional } from 'class-validator';

@InputType({ description: 'Input for setting a character trait value' })
export class CharacterTraitValueInput {
  /** The ID of the trait */
  @Field(() => ID, { description: 'The ID of the trait' })
  @IsUUID(4, { message: 'Trait ID must be a valid UUID' })
  traitId!: string;

  /** The value of the trait */
  @Field(() => String, {
    description: 'The value of the trait',
    nullable: true,
  })
  @IsOptional()
  value?: string | number | boolean | null;
}

@InputType({ description: 'Input for updating character trait values' })
export class UpdateCharacterTraitsInput {
  /** Array of trait values to set for the character */
  @Field(() => [CharacterTraitValueInput], {
    description: 'Array of trait values to set for the character',
  })
  traitValues!: CharacterTraitValueInput[];
}
