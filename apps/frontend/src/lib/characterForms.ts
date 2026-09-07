import type {
  CharacterFormInput,
  CharacterTraitValueInput,
} from "../generated/graphql";

/**
 * One form as the editor holds it, before it is submitted.
 *
 * `key` exists because `id` does not, yet: a form the member has just added
 * has no row behind it, and React still has to tell it apart from the other
 * new one they added a second later. Keying on array position instead would
 * move every field's state when a form is reordered or removed.
 *
 * `sortOrder` is deliberately absent. The server takes order from array
 * position, so carrying a number here would be a second answer to the same
 * question.
 */
export interface CharacterFormDraft {
  key: string;
  /** The form this edits. Absent for one being added. */
  id?: string;
  name: string;
  traitValues: CharacterTraitValueInput[];
}

let nextKey = 0;

/** A blank form, ready to be filled in. */
export function newFormDraft(name = "New form"): CharacterFormDraft {
  nextKey += 1;
  return { key: `new-${nextKey}`, name, traitValues: [] };
}

/** The editor's starting state for a character that has been loaded. */
export function draftsFromForms(
  forms: ReadonlyArray<{
    id: string;
    name: string;
    traitValues: ReadonlyArray<{
      traitId: string;
      value?: string | null;
      clarifier?: string | null;
    }>;
  }>,
): CharacterFormDraft[] {
  return forms.map((form) => ({
    key: form.id,
    id: form.id,
    name: form.name,
    traitValues: form.traitValues.map((tv) => ({
      traitId: tv.traitId,
      value: tv.value ?? "",
      clarifier: tv.clarifier ?? null,
    })),
  }));
}

/** What goes on the wire. Drops `key`, which is ours alone. */
export function draftsToInput(
  drafts: ReadonlyArray<CharacterFormDraft>,
): CharacterFormInput[] {
  return drafts.map((draft) => ({
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    traitValues: draft.traitValues,
  }));
}
