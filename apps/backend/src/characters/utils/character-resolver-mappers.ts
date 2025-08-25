import { Prisma } from "@chardb/database";
import {
  CreateCharacterInput,
  UpdateCharacterInput,
} from "../dto/character.dto";
import {
  UpdateCharacterTraitsInput,
  CharacterTraitValueInput,
} from "../dto/character-trait.dto";
import { Character } from "../entities/character.entity";
import { CharacterTraitValue } from "../../shared/types/character-trait.types";

/**
 * Resolver layer mapping functions to convert GraphQL DTOs to Prisma types
 */

function mapTraitValues(
  traitValues?: CharacterTraitValueInput[]
): PrismaJson.CharacterTraitValuesJson {
  if (!traitValues) return [];

  return traitValues
    .filter((tv) => tv.value !== undefined && tv.value !== null)
    .map((tv) => ({
      traitId: tv.traitId,
      value: tv.value!,
    }));
}

export function mapCreateCharacterInputToService(input: CreateCharacterInput): {
  characterData: Omit<Prisma.CharacterCreateInput, "owner" | "creator">;
  tags?: string[];
} {
  const { tags, ...characterData } = input;

  return {
    characterData: {
      name: characterData.name,
      species: characterData.species,
      age: characterData.age,
      gender: characterData.gender,
      description: characterData.description,
      personality: characterData.personality,
      backstory: characterData.backstory,
      visibility: characterData.visibility,
      isSellable: characterData.isSellable,
      isTradeable: characterData.isTradeable,
      price: characterData.price,
      customFields: characterData.customFields,
      traitValues: mapTraitValues(characterData.traitValues),
    },
    tags,
  };
}

export function mapUpdateCharacterInputToService(input: UpdateCharacterInput): {
  characterData: Prisma.CharacterUpdateInput;
  tags?: string[];
} {
  const { tags, ...inputData } = input;
  const characterData: Prisma.CharacterUpdateInput = {};

  if (inputData.name !== undefined) characterData.name = inputData.name;
  if (inputData.species !== undefined)
    characterData.species = inputData.species;
  if (inputData.age !== undefined) characterData.age = inputData.age;
  if (inputData.gender !== undefined) characterData.gender = inputData.gender;
  if (inputData.description !== undefined)
    characterData.description = inputData.description;
  if (inputData.personality !== undefined)
    characterData.personality = inputData.personality;
  if (inputData.backstory !== undefined)
    characterData.backstory = inputData.backstory;
  if (inputData.visibility !== undefined)
    characterData.visibility = inputData.visibility;
  if (inputData.isSellable !== undefined)
    characterData.isSellable = inputData.isSellable;
  if (inputData.isTradeable !== undefined)
    characterData.isTradeable = inputData.isTradeable;
  if (inputData.price !== undefined) characterData.price = inputData.price;
  if (inputData.customFields !== undefined)
    characterData.customFields = inputData.customFields;
  if (inputData.traitValues !== undefined)
    characterData.traitValues = mapTraitValues(inputData.traitValues);
  if (inputData.mainMediaId !== undefined) {
    characterData.mainMedia = inputData.mainMediaId
      ? { connect: { id: inputData.mainMediaId } }
      : { disconnect: true };
  }

  return { characterData, tags };
}

export function mapUpdateCharacterTraitsInputToService(
  input: UpdateCharacterTraitsInput
): {
  traitValues: PrismaJson.CharacterTraitValuesJson;
} {
  return {
    traitValues: mapTraitValues(input.traitValues),
  };
}

// Define the exact Prisma return type for updateTraits method
type PrismaCharacterWithRelations = Prisma.CharacterGetPayload<{
  include: {
    owner: true;
    creator: true;
    mainMedia: true;
    tags_rel: { include: { tag: true } };
    _count: { select: { media: true } };
  };
}>;

/**
 * Maps Prisma Character result to GraphQL Character entity
 */
export function mapPrismaCharacterToGraphQL(
  prismaCharacter: PrismaCharacterWithRelations
): Character {
  return {
    id: prismaCharacter.id,
    name: prismaCharacter.name,
    species: prismaCharacter.species,
    age: prismaCharacter.age,
    gender: prismaCharacter.gender,
    description: prismaCharacter.description,
    personality: prismaCharacter.personality,
    backstory: prismaCharacter.backstory,
    ownerId: prismaCharacter.ownerId,
    creatorId: prismaCharacter.creatorId,
    mainMediaId: prismaCharacter.mainMediaId,
    visibility: prismaCharacter.visibility,
    isSellable: prismaCharacter.isSellable,
    isTradeable: prismaCharacter.isTradeable,
    price: prismaCharacter.price?.toNumber(),
    customFields: prismaCharacter.customFields
      ? JSON.stringify(prismaCharacter.customFields)
      : null,
    traitValues: Array.isArray(prismaCharacter.traitValues)
      ? (
          prismaCharacter.traitValues as PrismaJson.CharacterTraitValuesJson
        ).map((tv) => ({
          traitId: tv.traitId,
          value: tv.value,
        }))
      : [],
    createdAt: prismaCharacter.createdAt,
    updatedAt: prismaCharacter.updatedAt,
  };
}
