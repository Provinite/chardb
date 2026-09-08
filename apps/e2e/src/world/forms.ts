import type {
  NewCharacterFormInput,
  CharacterFormsChangeInput,
  CharacterTraitValueInput,
} from "../generated/graphql.js";
import { SeedCharacterDocument } from "../generated/graphql.js";
import type { Actor } from "./types.js";

/**
 * Helpers for specs that touch a character's forms.
 *
 * Two shapes, because creating and changing are different operations. A path
 * that makes a character takes a plain list of forms, since nothing exists to
 * patch; a path that edits one takes a change -- add these, alter those,
 * remove the rest by name -- so that forgetting an id cannot delete anything.
 *
 * Most of these specs predate forms and care about one trait set, so most of
 * what they need is "one form" and "change the only form there is".
 */

/** A create-path form list for a character with a single form. */
export function oneForm(
  traitValues: CharacterTraitValueInput[],
  name = "Base",
): NewCharacterFormInput[] {
  return [{ name, traitValues }];
}

/** A change that adds a form. */
export function addForm(
  name: string,
  traitValues: CharacterTraitValueInput[] = [],
  sortOrder?: number,
): CharacterFormsChangeInput {
  return {
    newForms: [
      { name, traitValues, ...(sortOrder !== undefined ? { sortOrder } : {}) },
    ],
  };
}

/** A change to one existing form. */
export function editForm(
  id: string,
  patch: { name?: string; traitValues?: CharacterTraitValueInput[] },
): CharacterFormsChangeInput {
  return { updateForms: [{ id, ...patch }] };
}

/** A change that removes forms by id. */
export function removeForms(...ids: string[]): CharacterFormsChangeInput {
  return { removeForms: ids };
}

/**
 * A change that leaves a character with exactly these forms, in this order.
 *
 * The old complete-list semantics, expressed as a change: existing forms are
 * matched to the list by position and updated, anything past the end is added,
 * and anything left over is removed by id. The API stopped accepting a bare
 * list because *forgetting* an id there silently deleted and recreated forms;
 * computing the ids, which is what this does, was always fine.
 *
 * For specs whose subject is something else and whose characters just need to
 * be holding particular forms.
 */
export async function setForms(
  actor: Actor,
  characterId: string,
  forms: ReadonlyArray<{
    name: string;
    traitValues: CharacterTraitValueInput[];
  }>,
): Promise<CharacterFormsChangeInput> {
  const { character } = await actor.gql(SeedCharacterDocument, {
    id: characterId,
  });
  const existing = character.forms;

  const change: CharacterFormsChangeInput = {};
  const updates = forms
    .slice(0, existing.length)
    .map((form, i) => ({ id: existing[i].id, ...form, sortOrder: i }));
  const additions = forms
    .slice(existing.length)
    .map((form, i) => ({ ...form, sortOrder: existing.length + i }));
  const removals = existing.slice(forms.length).map((f) => f.id);

  if (updates.length) change.updateForms = updates;
  if (additions.length) change.newForms = additions;
  if (removals.length) change.removeForms = removals;
  return change;
}

/**
 * A change that sets the traits of a character's only form.
 *
 * What most of these specs mean when they say "give this character these
 * traits": they predate forms, their characters have exactly one, and the
 * change API needs that form's id. Reads it rather than making every spec
 * fetch the character just to find out.
 */
export async function setOnlyForm(
  actor: Actor,
  characterId: string,
  patch: { name?: string; traitValues?: CharacterTraitValueInput[] },
): Promise<CharacterFormsChangeInput> {
  const { character } = await actor.gql(SeedCharacterDocument, {
    id: characterId,
  });
  return editForm(character.forms[0].id, patch);
}

/** The trait values of a character's first form. */
export function baseTraits<T>(subject: {
  forms: ReadonlyArray<{ traitValues: readonly T[] }>;
}): readonly T[] {
  return subject.forms[0]?.traitValues ?? [];
}

/** The id of a character's first form, for a change that edits it. */
export function baseFormId(subject: {
  forms: ReadonlyArray<{ id: string }>;
}): string {
  return subject.forms[0].id;
}

/** The trait values of the first form in a review or audit snapshot. */
export function snapshotTraits<T>(
  snapshot: ReadonlyArray<{ traitValues: readonly T[] }>,
): readonly T[] {
  return snapshot[0]?.traitValues ?? [];
}
