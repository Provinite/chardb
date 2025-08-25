import { mapGraphQLToPrismaTraitValueType } from './trait-value-type-mapper';
import type { CreateTraitInput, UpdateTraitInput } from '../../traits/dto/trait.dto';
import type { CreateCharacterInput, UpdateCharacterInput } from '../../characters/dto/character.dto';
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

/**
 * Maps CreateCharacterInput DTO to Prisma create data
 */
export function mapCreateCharacterInputToPrisma(input: CreateCharacterInput): Prisma.CharacterCreateInput {
  return {
    name: input.name,
    species: input.species,
    age: input.age,
    gender: input.gender,
    description: input.description,
    personality: input.personality,
    backstory: input.backstory,
    visibility: input.visibility,
    isSellable: input.isSellable,
    isTradeable: input.isTradeable,
    price: input.price,
    customFields: input.customFields,
    traitValues: input.traitValues || [],
  };
}

/**
 * Maps UpdateCharacterInput DTO to Prisma update data
 */
export function mapUpdateCharacterInputToPrisma(input: UpdateCharacterInput): Prisma.CharacterUpdateInput {
  const data: Prisma.CharacterUpdateInput = {};
  
  if (input.name !== undefined) data.name = input.name;
  if (input.species !== undefined) data.species = input.species;
  if (input.age !== undefined) data.age = input.age;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.description !== undefined) data.description = input.description;
  if (input.personality !== undefined) data.personality = input.personality;
  if (input.backstory !== undefined) data.backstory = input.backstory;
  if (input.visibility !== undefined) data.visibility = input.visibility;
  if (input.isSellable !== undefined) data.isSellable = input.isSellable;
  if (input.isTradeable !== undefined) data.isTradeable = input.isTradeable;
  if (input.price !== undefined) data.price = input.price;
  if (input.customFields !== undefined) data.customFields = input.customFields;
  if (input.traitValues !== undefined) data.traitValues = input.traitValues;
  if (input.mainMediaId !== undefined) data.mainMediaId = input.mainMediaId;
  
  return data;
}