import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Species {
  /** Unique identifier for the species */
  @Field(() => ID, { description: 'Unique identifier for the species' })
  id: string;

  /** Name of the species (must be unique) */
  @Field({ description: 'Name of the species' })
  name: string;

  /** ID of the community that owns this species */
  @Field(() => ID, {
    description: 'ID of the community that owns this species',
  })
  communityId: string;

  /** Whether this species has an associated image */
  @Field({ description: 'Whether this species has an associated image' })
  hasImage: boolean;

  /** When the species was created */
  @Field({ description: 'When the species was created' })
  createdAt: Date;

  /** When the species was last updated */
  @Field({ description: 'When the species was last updated' })
  updatedAt: Date;
}

@ObjectType()
export class SpeciesConnection {
  /** List of species in this connection */
  @Field(() => [Species], { description: 'List of species in this connection' })
  nodes: Species[];

  /** Total number of species available */
  @Field({ description: 'Total number of species available' })
  totalCount: number;

  /** Whether there are more species after this page */
  @Field({ description: 'Whether there are more species after this page' })
  hasNextPage: boolean;

  /** Whether there are more species before this page */
  @Field({ description: 'Whether there are more species before this page' })
  hasPreviousPage: boolean;
}
