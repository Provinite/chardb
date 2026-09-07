import {
  ExternalAccountProvider,
  Prisma,
  TraitReviewSource,
} from "@chardb/database";
import {
  CreateCharacterInput,
  UpdateCharacterProfileInput,
  UpdateCharacterRegistryInput,
} from "../dto/character.dto";
import { PendingOwnerInput } from "../../pending-ownership/dto/pending-ownership.dto";
import { CharacterTraitValueInput } from "../dto/character-trait.dto";
import { CharacterFormInput } from "../dto/character-form.dto";
import { CharacterFormWrite } from "../../character-forms/character-forms.service";
import { Character, CharacterConnection } from "../entities/character.entity";

/**
 * Resolver layer mapping functions to convert GraphQL DTOs to Prisma types
 */

/** Exported for MYO redemption, which builds the same shape from its own input. */
export function mapTraitValues(
  traitValues?: CharacterTraitValueInput[],
): PrismaJson.CharacterTraitValuesJson {
  if (!traitValues) return [];

  return traitValues
    .filter((tv) => tv.value !== undefined && tv.value !== null)
    .map((tv) => {
      const clarifier = tv.clarifier?.trim();
      return {
        traitId: tv.traitId,
        value: tv.value!,
        ...(clarifier ? { clarifier } : {}),
      };
    });
}

/**
 * Turn submitted forms into the service's write shape.
 *
 * `sortOrder` is not mapped because it is not an input: the funnel takes it
 * from the position of each entry, so a client cannot submit two forms
 * claiming the same place.
 */
export function mapForms(
  forms?: CharacterFormInput[],
): CharacterFormWrite[] | undefined {
  if (!forms) return undefined;
  return forms.map((form) => ({
    ...(form.id ? { id: form.id } : {}),
    name: form.name,
    traitValues: mapTraitValues(form.traitValues),
  }));
}

export function mapCreateCharacterInputToService(input: CreateCharacterInput): {
  characterData: Omit<Prisma.CharacterCreateInput, "owner" | "creator">;
  forms?: CharacterFormWrite[];
  tags?: string[];
  pendingOwner?: {
    provider: ExternalAccountProvider;
    providerAccountId: string;
  };
  assignToSelf?: boolean;
  traitReviewSource?: TraitReviewSource;
} {
  const {
    tags,
    pendingOwner,
    assignToSelf,
    traitReviewSource,
    ...characterData
  } = input;

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
    isSellableForCoin: characterData.isSellableForCoin,
    isTradeableForArt: characterData.isTradeableForArt,
    isOpenToOffers: characterData.isOpenToOffers,
    isFreebie: characterData.isFreebie,
    price: characterData.price,
    customFields: characterData.customFields
      ? JSON.parse(characterData.customFields)
      : undefined,
  };

  return {
    characterData: prismaCharacterData,
    forms: mapForms(characterData.forms),
    tags,
    pendingOwner,
    assignToSelf,
    traitReviewSource,
  };
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
  if (inputData.isSellableForCoin !== undefined)
    characterData.isSellableForCoin = inputData.isSellableForCoin;
  if (inputData.isTradeableForArt !== undefined)
    characterData.isTradeableForArt = inputData.isTradeableForArt;
  if (inputData.isOpenToOffers !== undefined)
    characterData.isOpenToOffers = inputData.isOpenToOffers;
  if (inputData.isFreebie !== undefined)
    characterData.isFreebie = inputData.isFreebie;
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
 * Registry fields: registryId, speciesVariantId, forms
 */
export function mapUpdateCharacterRegistryInputToService(
  input: UpdateCharacterRegistryInput,
): {
  characterData: Prisma.CharacterUpdateInput;
  forms?: CharacterFormWrite[];
} {
  const characterData: Prisma.CharacterUpdateInput = {};

  if (input.registryId !== undefined)
    characterData.registryId = input.registryId;
  if (input.speciesVariantId !== undefined) {
    characterData.speciesVariant = input.speciesVariantId
      ? { connect: { id: input.speciesVariantId } }
      : { disconnect: true };
  }

  return { characterData, forms: mapForms(input.forms) };
}

// Define the exact Prisma return type
type PrismaCharacter = Prisma.CharacterGetPayload<Record<string, never>>;

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
    isSellableForCoin: prismaCharacter.isSellableForCoin,
    isTradeableForArt: prismaCharacter.isTradeableForArt,
    isOpenToOffers: prismaCharacter.isOpenToOffers,
    isFreebie: prismaCharacter.isFreebie,
    price: prismaCharacter.price?.toNumber(),
    customFields: prismaCharacter.customFields
      ? JSON.stringify(prismaCharacter.customFields)
      : undefined,
    traitReviewStatus: prismaCharacter.traitReviewStatus ?? undefined,
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
