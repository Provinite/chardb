import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class EnumValue {
  /** Unique identifier for the enum value */
  @Field(() => ID, { description: 'Unique identifier for the enum value' })
  id: string;

  /** Name/display text of this enum value */
  @Field({ description: 'Name/display text of this enum value' })
  name: string;

  /** Display order within the trait's enum values */
  @Field(() => Int, {
    description: "Display order within the trait's enum values",
  })
  order: number;

  /** ID of the trait this enum value belongs to */
  @Field(() => ID, {
    description: 'ID of the trait this enum value belongs to',
  })
  traitId: string;

  /** When the enum value was created */
  @Field({ description: 'When the enum value was created' })
  createdAt: Date;

  /** When the enum value was last updated */
  @Field({ description: 'When the enum value was last updated' })
  updatedAt: Date;
}

@ObjectType()
export class EnumValueConnection {
  /** List of enum values in this connection */
  @Field(() => [EnumValue], {
    description: 'List of enum values in this connection',
  })
  nodes: EnumValue[];

  /** Total number of enum values available */
  @Field({ description: 'Total number of enum values available' })
  totalCount: number;

  /** Whether there are more enum values after this page */
  @Field({ description: 'Whether there are more enum values after this page' })
  hasNextPage: boolean;

  /** Whether there are more enum values before this page */
  @Field({ description: 'Whether there are more enum values before this page' })
  hasPreviousPage: boolean;
}
