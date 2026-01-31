import { ExternalAccountProvider, Prisma } from "@chardb/database";
import {
  CreateCharacterInput,
  UpdateCharacterInput,
  UpdateCharacterProfileInput,
  UpdateCharacterRegistryInput,
} from "../dto/character.dto";
import { PendingOwnerInput } from "../../pending-ownership/dto/pending-ownership.dto";
import { CharacterTraitValueInput } from "../dto/character-trait.dto";
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
  assignToSelf?: boolean;
} {
  const { tags, pendingOwner, assignToSelf, ...characterData } = input;

  const prismaCharacterData: Omit<
    Prisma.CharacterCreateInput,
    "owner" | "creator"
  > = {
    name: characterData.name,
    registryId: characterData.registryId,
    species: characterData.speciesId
      ? { connect: { id: characterData.speciesId } }
      : undefined,
    speciesVariant: characterData.speciesVariantId
      ? { connect: { id: characterData.speciesVariantId } }
      : undefined,
    details: characterData.details,
    visibility: characterData.visibility,
    isSellable: characterData.isSellable,
    isTradeable: characterData.isTradeable,
    price: characterData.price,
    customFields: characterData.customFields
      ? JSON.parse(characterData.customFields)
      : undefined,
    traitValues: mapTraitValues(characterData.traitValues),
  };

  return {
    characterData: prismaCharacterData,
    tags,
    pendingOwner,
    assignToSelf,
  };
}

export function mapUpdateCharacterInputToService(input: UpdateCharacterInput): {
  characterData: Prisma.CharacterUpdateInput;
  tags?: string[];
  pendingOwner?: PendingOwnerInput | null;
  ownerId?: string | null;
} {
  const { tags, pendingOwnerUpdate, ownerIdUpdate, ...inputData } = input;
  const characterData: Prisma.CharacterUpdateInput = {};

  if (inputData.name !== undefined) characterData.name = inputData.name;
  if (inputData.registryId !== undefined) characterData.registryId = inputData.registryId;
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
  if (inputData.details !== undefined)
    characterData.details = inputData.details;
  if (inputData.visibility !== undefined)
    characterData.visibility = inputData.visibility;
  if (inputData.isSellable !== undefined)
    characterData.isSellable = inputData.isSellable;
  if (inputData.isTradeable !== undefined)
    characterData.isTradeable = inputData.isTradeable;
  if (inputData.price !== undefined) characterData.price = inputData.price;
  if (inputData.customFields !== undefined) {
    characterData.customFields = inputData.customFields
      ? JSON.parse(inputData.customFields)
      : undefined;
  }
  if (inputData.traitValues !== undefined)
    characterData.traitValues = mapTraitValues(inputData.traitValues);
  if (inputData.mainMediaId !== undefined) {
    characterData.mainMedia = inputData.mainMediaId
      ? { connect: { id: inputData.mainMediaId } }
      : { disconnect: true };
  }

  // Extract values from wrapper types
  const pendingOwner = pendingOwnerUpdate?.set;
  const ownerId = ownerIdUpdate?.set;

  return { characterData, tags, pendingOwner, ownerId };
}

/**
 * Maps UpdateCharacterProfileInput to service format
 * Profile fields: name, details, visibility, trade settings, tags, mainMedia, ownership
 */
export function mapUpdateCharacterProfileInputToService(
  input: UpdateCharacterProfileInput,
): {
  characterData: Prisma.CharacterUpdateInput;
  tags?: string[];
  pendingOwner?: PendingOwnerInput | null;
  ownerId?: string | null;
} {
  const { tags, pendingOwnerUpdate, ownerIdUpdate, ...inputData } = input;
  const characterData: Prisma.CharacterUpdateInput = {};

  if (inputData.name !== undefined) characterData.name = inputData.name;
  if (inputData.details !== undefined)
    characterData.details = inputData.details;
  if (inputData.visibility !== undefined)
    characterData.visibility = inputData.visibility;
  if (inputData.isSellable !== undefined)
    characterData.isSellable = inputData.isSellable;
  if (inputData.isTradeable !== undefined)
    characterData.isTradeable = inputData.isTradeable;
  if (inputData.price !== undefined) characterData.price = inputData.price;
  if (inputData.customFields !== undefined) {
    characterData.customFields = inputData.customFields
      ? JSON.parse(inputData.customFields)
      : undefined;
  }
  if (inputData.mainMediaId !== undefined) {
    characterData.mainMedia = inputData.mainMediaId
      ? { connect: { id: inputData.mainMediaId } }
      : { disconnect: true };
  }

  // Extract values from wrapper types
  const pendingOwner = pendingOwnerUpdate?.set;
  const ownerId = ownerIdUpdate?.set;

  return { characterData, tags, pendingOwner, ownerId };
}

/**
 * Maps UpdateCharacterRegistryInput to service format
 * Registry fields: registryId, speciesVariantId, traitValues
 */
export function mapUpdateCharacterRegistryInputToService(
  input: UpdateCharacterRegistryInput,
): {
  characterData: Prisma.CharacterUpdateInput;
} {
  const characterData: Prisma.CharacterUpdateInput = {};

  if (input.registryId !== undefined)
    characterData.registryId = input.registryId;
  if (input.speciesVariantId !== undefined) {
    characterData.speciesVariant = input.speciesVariantId
      ? { connect: { id: input.speciesVariantId } }
      : { disconnect: true };
  }
  if (input.traitValues !== undefined)
    characterData.traitValues = mapTraitValues(input.traitValues);

  return { characterData };
}

// Define the exact Prisma return type
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
    registryId: prismaCharacter.registryId ?? undefined,
    speciesId: prismaCharacter.speciesId ?? undefined,
    speciesVariantId: prismaCharacter.speciesVariantId ?? undefined,
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
