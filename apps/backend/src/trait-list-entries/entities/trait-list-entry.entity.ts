import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { TraitValueType } from '../../shared/enums/trait-value-type.enum';

@ObjectType()
export class TraitListEntry {
  /** Unique identifier for the trait list entry */
  @Field(() => ID, { description: 'Unique identifier for the trait list entry' })
  id: string;

  /** ID of the trait this entry configures */
  @Field(() => ID, { description: 'ID of the trait this entry configures' })
  traitId: string;

  /** ID of the species variant this entry belongs to */
  @Field(() => ID, { description: 'ID of the species variant this entry belongs to' })
  speciesVariantId: string;

  /** Display order of this trait in the variant's trait list */
  @Field(() => Int, { description: 'Display order of this trait in the variant\'s trait list' })
  order: number;

  /** Whether this trait is required for critters using this variant */
  @Field({ description: 'Whether this trait is required for critters using this variant' })
  required: boolean;

  /** Type of values this trait stores (copied from trait for convenience) */
  @Field(() => TraitValueType, { description: 'Type of values this trait stores' })
  valueType: TraitValueType;

  /** Default string value for this trait */
  @Field({ nullable: true, description: 'Default string value for this trait' })
  defaultValueString?: string;

  /** Default integer value for this trait */
  @Field(() => Int, { nullable: true, description: 'Default integer value for this trait' })
  defaultValueInt?: number;

  /** Default timestamp value for this trait */
  @Field({ nullable: true, description: 'Default timestamp value for this trait' })
  defaultValueTimestamp?: Date;

  /** When the trait list entry was created */
  @Field({ description: 'When the trait list entry was created' })
  createdAt: Date;

  /** When the trait list entry was last updated */
  @Field({ description: 'When the trait list entry was last updated' })
  updatedAt: Date;

}

@ObjectType()
export class TraitListEntryConnection {
  /** List of trait list entries in this connection */
  @Field(() => [TraitListEntry], { description: 'List of trait list entries in this connection' })
  nodes: TraitListEntry[];

  /** Total number of trait list entries available */
  @Field({ description: 'Total number of trait list entries available' })
  totalCount: number;

  /** Whether there are more trait list entries after this page */
  @Field({ description: 'Whether there are more trait list entries after this page' })
  hasNextPage: boolean;

  /** Whether there are more trait list entries before this page */
  @Field({ description: 'Whether there are more trait list entries before this page' })
  hasPreviousPage: boolean;
}