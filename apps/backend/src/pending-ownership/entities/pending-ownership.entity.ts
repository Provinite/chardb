import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { ExternalAccountProvider } from '@chardb/database';
import { Character } from '../../characters/entities/character.entity';
import { Item } from '../../items/entities/item.entity';
import { User } from '../../users/entities/user.entity';

// Register the enum for GraphQL
registerEnumType(ExternalAccountProvider, {
  name: 'ExternalAccountProvider',
  description: 'The external account provider type',
});

@ObjectType()
export class PendingOwnership {
  @Field(() => ID)
  id: string;

  @Field(() => ID, { nullable: true, description: 'Character ID if this is a pending character ownership' })
  characterId?: string;

  @Field(() => ID, { nullable: true, description: 'Item ID if this is a pending item ownership' })
  itemId?: string;

  @Field(() => ExternalAccountProvider, { description: 'The external account provider (Discord, DeviantArt, etc.)' })
  provider: ExternalAccountProvider;

  @Field({ description: 'The account identifier on the external provider' })
  providerAccountId: string;

  @Field({ description: 'When this pending ownership was created' })
  createdAt: Date;

  @Field({ nullable: true, description: 'When this pending ownership was claimed' })
  claimedAt?: Date;

  @Field(() => ID, { nullable: true, description: 'User who claimed this pending ownership' })
  claimedByUserId?: string;

  // Relations
  @Field(() => Character, { nullable: true })
  character?: Character;

  @Field(() => Item, { nullable: true })
  item?: Item;

  @Field(() => User, { nullable: true })
  claimedByUser?: User;
}
