import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { ExternalAccountProvider } from '@prisma/client';

// Register the enum for GraphQL
registerEnumType(ExternalAccountProvider, {
  name: 'ExternalAccountProvider',
  description: 'External account providers supported for account linking',
});

@ObjectType()
export class ExternalAccount {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field(() => ExternalAccountProvider)
  provider: ExternalAccountProvider;

  @Field()
  providerAccountId: string;

  @Field()
  displayName: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
