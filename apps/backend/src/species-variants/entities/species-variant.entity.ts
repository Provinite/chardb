import { ObjectType, Field, ID } from '@nestjs/graphql';
import { CommunityColor } from '../../community-colors/entities/community-color.entity';

@ObjectType()
export class SpeciesVariant {
  /** Unique identifier for the species variant */
  @Field(() => ID, { description: 'Unique identifier for the species variant' })
  id: string;

  /** Name of the species variant (unique within species) */
  @Field({ description: 'Name of the species variant' })
  name: string;

  /** ID of the species this variant belongs to */
  @Field(() => ID, { description: 'ID of the species this variant belongs to' })
  speciesId: string;

  /** ID of the color for this species variant */
  @Field(() => ID, { nullable: true, description: 'ID of the color for this species variant' })
  colorId?: string;

  /** When the species variant was created */
  @Field({ description: 'When the species variant was created' })
  createdAt: Date;

  /** When the species variant was last updated */
  @Field({ description: 'When the species variant was last updated' })
  updatedAt: Date;

  /** Color associated with this species variant */
  @Field(() => CommunityColor, { nullable: true, description: 'Color associated with this species variant' })
  color?: CommunityColor;

}

@ObjectType()
export class SpeciesVariantConnection {
  /** List of species variants in this connection */
  @Field(() => [SpeciesVariant], { description: 'List of species variants in this connection' })
  nodes: SpeciesVariant[];

  /** Total number of species variants available */
  @Field({ description: 'Total number of species variants available' })
  totalCount: number;

  /** Whether there are more species variants after this page */
  @Field({ description: 'Whether there are more species variants after this page' })
  hasNextPage: boolean;

  /** Whether there are more species variants before this page */
  @Field({ description: 'Whether there are more species variants before this page' })
  hasPreviousPage: boolean;
}