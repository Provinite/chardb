import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType({ description: 'Input for creating a new character ownership change record' })
export class CreateCharacterOwnershipChangeInput {
  /** The character whose ownership is being changed */
  @Field(() => ID, { description: 'The ID of the character whose ownership is being changed' })
  @IsUUID(4, { message: 'Character ID must be a valid UUID' })
  characterId!: string;

  /** The previous owner (null for initial character creation) */
  @Field(() => ID, { description: 'The ID of the previous owner (null for initial character creation)', nullable: true })
  @IsUUID(4, { message: 'From user ID must be a valid UUID' })
  fromUserId?: string | null;

  /** The new owner */
  @Field(() => ID, { description: 'The ID of the new owner' })
  @IsUUID(4, { message: 'To user ID must be a valid UUID' })
  toUserId!: string;
}