import { InputType, Field, ID } from '@nestjs/graphql';
import { ExternalAccountProvider } from '@chardb/database';
import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';

@InputType()
export class PendingOwnerInput {
  @Field(() => ExternalAccountProvider, { description: 'The external account provider' })
  @IsEnum(ExternalAccountProvider)
  provider: ExternalAccountProvider;

  @Field({ description: 'The account identifier on the external provider (Discord user ID, DeviantArt username, etc.)' })
  @IsString()
  @IsNotEmpty()
  providerAccountId: string;
}

@InputType()
export class CreatePendingOwnershipForCharacterInput {
  @Field(() => ID, { description: 'Character ID' })
  @IsUUID()
  characterId: string;

  @Field(() => PendingOwnerInput, { description: 'External account information' })
  pendingOwner: PendingOwnerInput;
}

@InputType()
export class CreatePendingOwnershipForItemInput {
  @Field(() => ID, { description: 'Item ID' })
  @IsUUID()
  itemId: string;

  @Field(() => PendingOwnerInput, { description: 'External account information' })
  pendingOwner: PendingOwnerInput;
}

@InputType()
export class PendingOwnershipFiltersInput {
  @Field(() => ExternalAccountProvider, { nullable: true, description: 'Filter by provider' })
  @IsEnum(ExternalAccountProvider)
  provider?: ExternalAccountProvider;

  @Field({ nullable: true, description: 'Filter by provider account ID' })
  @IsString()
  providerAccountId?: string;

  @Field({ nullable: true, description: 'Filter by claimed status. True = claimed, False = unclaimed, undefined = all' })
  claimed?: boolean;
}
