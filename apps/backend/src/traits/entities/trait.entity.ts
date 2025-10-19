import { ObjectType, Field, ID } from '@nestjs/graphql';
import { TraitValueType } from '../../shared/enums/trait-value-type.enum';

@ObjectType()
export class Trait {
  /** Unique identifier for the trait */
  @Field(() => ID, { description: 'Unique identifier for the trait' })
  id: string;

  /** Name of the trait (unique within species) */
  @Field({ description: 'Name of the trait' })
  name: string;

  /** Type of values this trait can store */
  @Field(() => TraitValueType, {
    description: 'Type of values this trait can store',
  })
  valueType: TraitValueType;

  /** ID of the species this trait belongs to */
  @Field(() => ID, { description: 'ID of the species this trait belongs to' })
  speciesId: string;

  /** When the trait was created */
  @Field({ description: 'When the trait was created' })
  createdAt: Date;

  /** When the trait was last updated */
  @Field({ description: 'When the trait was last updated' })
  updatedAt: Date;
}

@ObjectType()
export class TraitConnection {
  /** List of traits in this connection */
  @Field(() => [Trait], { description: 'List of traits in this connection' })
  nodes: Trait[];

  /** Total number of traits available */
  @Field({ description: 'Total number of traits available' })
  totalCount: number;

  /** Whether there are more traits after this page */
  @Field({ description: 'Whether there are more traits after this page' })
  hasNextPage: boolean;

  /** Whether there are more traits before this page */
  @Field({ description: 'Whether there are more traits before this page' })
  hasPreviousPage: boolean;
}
