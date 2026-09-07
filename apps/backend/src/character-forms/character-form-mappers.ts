import { CharacterForm as PrismaCharacterForm } from "@chardb/database";
import { CharacterTraitValue } from "../shared/types/character-trait.types";
import { CharacterFormSnapshot } from "../shared/types/character-form.types";
import { CharacterForm } from "../characters/entities/character-form.entity";

/** Map stored trait values to their GraphQL shape. */
export function mapTraitValuesJson(
  json: PrismaJson.CharacterTraitValuesJson,
): CharacterTraitValue[] {
  return json.map((tv) => ({
    traitId: tv.traitId,
    value: tv.value,
    clarifier: tv.clarifier ?? null,
  }));
}

/**
 * Map a stored form snapshot to its GraphQL shape.
 *
 * Snapshots are what the review and audit tables hold; nothing is read back
 * through `formId`, because the form it names may be gone.
 */
export function mapFormsJson(
  json: PrismaJson.CharacterFormsJson,
): CharacterFormSnapshot[] {
  return json.map((form) => ({
    formId: form.formId,
    name: form.name,
    sortOrder: form.sortOrder,
    traitValues: mapTraitValuesJson(form.traitValues),
  }));
}

/** Map a live form row to its GraphQL shape. */
export function mapPrismaCharacterFormToGraphQL(
  row: PrismaCharacterForm,
): CharacterForm {
  return {
    id: row.id,
    characterId: row.characterId,
    name: row.name,
    sortOrder: row.sortOrder,
    traitValues: mapTraitValuesJson(
      row.traitValues as PrismaJson.CharacterTraitValuesJson,
    ),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
