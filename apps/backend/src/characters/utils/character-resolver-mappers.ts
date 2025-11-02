import { ExternalAccountProvider, Prisma } from "@chardb/database";
import {
  CreateCharacterInput,
  UpdateCharacterInput,
} from "../dto/character.dto";
import { PendingOwnerInput } from "../../pending-ownership/dto/pending-ownership.dto";
import {
  UpdateCharacterTraitsInput,
  CharacterTraitValueInput,
} from "../dto/character-trait.dto";
import { Character, CharacterConnection } from "../entities/character.entity";
import { CharacterTraitValue } from "../../shared/types/character-trait.types";

/**
 * Resolver layer mapping functions to convert GraphQL DTOs to Prisma types
 */

function mapTraitValues(
  traitValues?: CharacterTraitValueInput[],
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
  pendingOwner?: {
    provider: ExternalAccountProvider;
    providerAccountId: string;
  };
} {
  const { tags, pendingOwner, ...characterData } = input;

  const prismaCharacterData: Omit<
    Prisma.CharacterCreateInput,
    "owner" | "creator"
  > = {
    name: characterData.name,
    species: characterData.speciesId
      ? { connect: { id: characterData.speciesId } }
      : undefined,
    speciesVariant: characterData.speciesVariantId
      ? { connect: { id: characterData.speciesVariantId } }
      : undefined,
    age: characterData.age,
    gender: characterData.gender,
    details: characterData.details,
    visibility: characterData.visibility,
    isSellable: characterData.isSellable,
    isTradeable: characterData.isTradeable,
    price: characterData.price,
    customFields: characterData.customFields,
    traitValues: mapTraitValues(characterData.traitValues),
  };

  return {
    characterData: prismaCharacterData,
    tags,
    pendingOwner,
  };
}

export function mapUpdateCharacterInputToService(input: UpdateCharacterInput): {
  characterData: Prisma.CharacterUpdateInput;
  tags?: string[];
  pendingOwner?: PendingOwnerInput | null;
} {
  const { tags, pendingOwner, ...inputData } = input;
  const characterData: Prisma.CharacterUpdateInput = {};

  if (inputData.name !== undefined) characterData.name = inputData.name;
  if (inputData.speciesId !== undefined) {
    characterData.species = inputData.speciesId
      ? { connect: { id: inputData.speciesId } }
      : { disconnect: true };
  }
  if (inputData.speciesVariantId !== undefined) {
    characterData.speciesVariant = inputData.speciesVariantId
      ? { connect: { id: inputData.speciesVariantId } }
      : { disconnect: true };
  }
  if (inputData.age !== undefined) characterData.age = inputData.age;
  if (inputData.gender !== undefined) characterData.gender = inputData.gender;
  if (inputData.details !== undefined)
    characterData.details = inputData.details;
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

  return { characterData, tags, pendingOwner };
}

export function mapUpdateCharacterTraitsInputToService(
  input: UpdateCharacterTraitsInput,
): {
  traitValues: PrismaJson.CharacterTraitValuesJson;
} {
  return {
    traitValues: mapTraitValues(input.traitValues),
  };
}

// Define the exact Prisma return type for updateTraits method
type PrismaCharacter = Prisma.CharacterGetPayload<{}>;

/**
 * Maps Prisma Character result to GraphQL Character entity
 * Only includes scalar fields - relations handled by field resolvers
 */
export function mapPrismaCharacterToGraphQL(
  prismaCharacter: PrismaCharacter,
): Character {
  return {
    id: prismaCharacter.id,
    name: prismaCharacter.name,
    speciesId: prismaCharacter.speciesId ?? undefined,
    speciesVariantId: prismaCharacter.speciesVariantId ?? undefined,
    age: prismaCharacter.age ?? undefined,
    gender: prismaCharacter.gender ?? undefined,
    details: prismaCharacter.details ?? undefined,
    ownerId: prismaCharacter.ownerId ?? undefined,
    isOrphaned: prismaCharacter.ownerId === null,
    creatorId: prismaCharacter.creatorId ?? undefined,
    mainMediaId: prismaCharacter.mainMediaId ?? undefined,
    visibility: prismaCharacter.visibility,
    isSellable: prismaCharacter.isSellable,
    isTradeable: prismaCharacter.isTradeable,
    price: prismaCharacter.price?.toNumber(),
    customFields: prismaCharacter.customFields
      ? JSON.stringify(prismaCharacter.customFields)
      : undefined,
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

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaCharacterConnectionToGraphQL(serviceResult: {
  characters: PrismaCharacter[];
  total: number;
  hasMore: boolean;
}): CharacterConnection {
  return {
    characters: serviceResult.characters.map(mapPrismaCharacterToGraphQL),
    total: serviceResult.total,
    hasMore: serviceResult.hasMore,
  };
}
