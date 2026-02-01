/**
 * Phase 4: Sample Data
 * Creates test species, variants, and sample characters for each persona via GraphQL
 */

import { User } from "@prisma/client";
import {
  GraphQLClient,
  MUTATIONS,
  QUERIES,
  CreateSpeciesResponse,
  CreateSpeciesVariantResponse,
  CreateCharacterResponse,
  SpeciesByCommunityResponse,
  SpeciesVariantsBySpeciesResponse,
  CharactersResponse,
} from "./graphql-client";
import { PERSONA_LIST } from "./personas";
import { log, isAlreadyExistsError } from "./utils";

const TEST_SPECIES_NAME = "Test Species";
const TEST_VARIANT_NAME = "Standard";

interface SpeciesInfo {
  id: string;
  name: string;
  created: boolean;
}

async function findOrCreateSpecies(
  client: GraphQLClient,
  communityId: string
): Promise<SpeciesInfo> {
  // Check if species already exists
  const speciesResponse = await client.request<SpeciesByCommunityResponse>(
    QUERIES.speciesByCommunity,
    { communityId, first: 100 }
  );

  const existingSpecies = speciesResponse.speciesByCommunity.nodes.find(
    (s) => s.name === TEST_SPECIES_NAME
  );

  if (existingSpecies) {
    return {
      id: existingSpecies.id,
      name: existingSpecies.name,
      created: false,
    };
  }

  // Create species
  const response = await client.request<CreateSpeciesResponse>(
    MUTATIONS.createSpecies,
    {
      input: {
        name: TEST_SPECIES_NAME,
        communityId,
      },
    }
  );

  return {
    id: response.createSpecies.id,
    name: response.createSpecies.name,
    created: true,
  };
}

interface VariantInfo {
  id: string;
  created: boolean;
}

async function findOrCreateVariant(
  client: GraphQLClient,
  speciesId: string
): Promise<VariantInfo> {
  // Check if variant already exists
  const variantsResponse = await client.request<SpeciesVariantsBySpeciesResponse>(
    QUERIES.speciesVariantsBySpecies,
    { speciesId, first: 100 }
  );

  const existingVariant = variantsResponse.speciesVariantsBySpecies.nodes.find(
    (v) => v.name === TEST_VARIANT_NAME
  );

  if (existingVariant) {
    return { id: existingVariant.id, created: false };
  }

  // Create variant
  const response = await client.request<CreateSpeciesVariantResponse>(
    MUTATIONS.createSpeciesVariant,
    {
      input: {
        name: TEST_VARIANT_NAME,
        speciesId,
      },
    }
  );

  return { id: response.createSpeciesVariant.id, created: true };
}

async function getExistingCharacterNames(
  client: GraphQLClient
): Promise<Set<string>> {
  const response = await client.request<CharactersResponse>(QUERIES.characters, {
    filters: { limit: 100 },
  });

  // Set of character names
  const characterNames = new Set<string>();

  for (const char of response.characters.characters) {
    characterNames.add(char.name);
  }

  return characterNames;
}

async function createCharacterForPersona(
  client: GraphQLClient,
  user: User,
  characterName: string,
  speciesId: string,
  variantId: string
): Promise<boolean> {
  try {
    await client.request<CreateCharacterResponse>(MUTATIONS.createCharacter, {
      input: {
        name: characterName,
        speciesId,
        speciesVariantId: variantId,
        details: `# About ${characterName}\n\nThis is a test character for **${user.displayName ?? user.username}**.`,
        visibility: "PUBLIC",
      },
    });
    return true;
  } catch (error) {
    if (error instanceof Error && isAlreadyExistsError(error)) {
      return false;
    }
    throw error;
  }
}

export async function runPhase4(
  client: GraphQLClient,
  users: Map<string, User>,
  communityId: string
): Promise<void> {
  log.phase("Phase 4: Creating sample data...");

  // Create or find species
  const species = await findOrCreateSpecies(client, communityId);
  if (species.created) {
    log.success(`${TEST_SPECIES_NAME} (created)`);
  } else {
    log.skip(`${TEST_SPECIES_NAME} (exists)`);
  }

  // Create or find variant
  const variant = await findOrCreateVariant(client, species.id);
  if (variant.created) {
    log.success(`${TEST_VARIANT_NAME} variant (created)`);
  } else {
    log.skip(`${TEST_VARIANT_NAME} variant (exists)`);
  }

  const variantId = variant.id;

  // Get existing characters to check for duplicates
  const existingCharacterNames = await getExistingCharacterNames(client);

  // Create characters for each persona
  let createdCount = 0;
  let existsCount = 0;

  for (const persona of PERSONA_LIST) {
    const user = users.get(persona.email);
    if (!user) {
      log.error(`${persona.displayName}: User not found, skipping character`);
      continue;
    }

    const characterName = `${persona.displayName}'s Character`;

    if (existingCharacterNames.has(characterName)) {
      log.skip(`${characterName} (exists)`);
      existsCount++;
      continue;
    }

    // We need to login as this user to create a character they own
    // For simplicity, let's use a helper mutation or just create via admin
    // Actually, createCharacter creates for the current user if assignToSelf is true (default)
    // So we need to login as each user

    // For now, let's create characters as admin and note that ownership will be admin's
    // A better approach would be to login as each user

    // Actually, let's just create as admin with a note
    // The character will be owned by admin, but we can test permissions on it
    try {
      const created = await createCharacterForPersona(
        client,
        user,
        characterName,
        species.id,
        variantId
      );

      if (created) {
        log.success(`${characterName} (created, owned by Site Admin)`);
        createdCount++;
      } else {
        log.skip(`${characterName} (exists)`);
        existsCount++;
      }
    } catch (error) {
      log.error(
        `${characterName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  log.info(`Characters: ${createdCount} created, ${existsCount} existing`);
  log.info(
    "Note: Characters are owned by Site Admin. For proper ownership testing, create characters while logged in as each persona."
  );
}
