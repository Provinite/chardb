import { mapGraphQLToPrismaTraitValueType } from './trait-value-type-mapper';
import type { CreateTraitInput, UpdateTraitInput } from '../../traits/dto/trait.dto';
import type { Prisma } from '@chardb/database';

/**
 * Maps CreateTraitInput DTO to Prisma create data, handling enum conversion
 */
export function mapCreateTraitInputToPrisma(input: CreateTraitInput): Prisma.TraitCreateInput {
  return {
    name: input.name,
    valueType: mapGraphQLToPrismaTraitValueType(input.valueType),
    species: {
      connect: { id: input.speciesId },
    },
  };
}

/**
 * Maps UpdateTraitInput DTO to Prisma update data, preserving all defined values
 * including falsy ones like false, 0, "", null while excluding undefined
 */
export function mapUpdateTraitInputToPrisma(input: UpdateTraitInput): Prisma.TraitUpdateInput {
  const data: Prisma.TraitUpdateInput = {};
  
  // Only include fields that are explicitly defined (not undefined)
  if (input.name !== undefined) {
    data.name = input.name;
  }
  
  if (input.valueType !== undefined) {
    data.valueType = mapGraphQLToPrismaTraitValueType(input.valueType);
  }
  
  if (input.speciesId !== undefined) {
    data.species = {
      connect: { id: input.speciesId },
    };
  }
  
  return data;
}