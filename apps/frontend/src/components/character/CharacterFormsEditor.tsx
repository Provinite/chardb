import React from "react";
import styled from "styled-components";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button, Input } from "@chardb/ui";
import { TraitForm } from "./TraitForm";
import {
  newFormDraft,
  type CharacterFormDraft,
} from "../../lib/characterForms";
import type { SpeciesVariantDetailsFragment } from "../../generated/graphql";

const Forms = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const FormCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
`;

const FormHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const NameField = styled.div`
  flex: 1;
  min-width: 0;
`;

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Help = styled.p`
  margin: ${({ theme }) => theme.spacing.sm} 0 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

interface Props {
  forms: CharacterFormDraft[];
  onChange: (forms: CharacterFormDraft[]) => void;
  /** From the variant. One means this character does not do forms. */
  maxForms: number;
  speciesId: string;
  speciesVariant: SpeciesVariantDetailsFragment | null;
  disabled?: boolean;
}

/**
 * Editing a character's forms: their names, their order, and each one's
 * traits.
 *
 * A character with one form on a variant that allows one is the ordinary case,
 * and it renders as it always did -- a bare trait editor, with no name field
 * and no chrome suggesting there could be another. The scaffolding only
 * appears once a second form is possible, so communities that do not use
 * transformations never see the feature.
 *
 * Every form is edited against the same variant, because a character's forms
 * share its variant. That is what makes one `TraitForm` per form correct
 * rather than merely convenient: they are all offering the same trait list.
 */
export const CharacterFormsEditor: React.FC<Props> = ({
  forms,
  onChange,
  maxForms,
  speciesId,
  speciesVariant,
  disabled,
}) => {
  const multiple = maxForms > 1 || forms.length > 1;

  const update = (index: number, patch: Partial<CharacterFormDraft>) => {
    onChange(forms.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const move = (index: number, by: number) => {
    const to = index + by;
    if (to < 0 || to >= forms.length) return;
    const next = [...forms];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  };

  return (
    <Forms data-testid="character-forms-editor">
      {forms.map((form, index) => {
        const body = (
          <TraitForm
            speciesId={speciesId}
            speciesVariant={speciesVariant}
            traitValues={form.traitValues}
            onChange={(traitValues) => update(index, { traitValues })}
            disabled={disabled}
          />
        );

        if (!multiple) return <div key={form.key}>{body}</div>;

        return (
          <FormCard key={form.key} data-testid={`form-editor-${index}`}>
            <FormHead>
              <NameField>
                <Input
                  value={form.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  placeholder="Form name, e.g. Awakened"
                  disabled={disabled}
                  maxLength={100}
                  data-testid={`form-name-${index}`}
                  aria-label={`Name of form ${index + 1}`}
                />
              </NameField>
              <IconButton
                type="button"
                title="Move up"
                aria-label="Move up"
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
              >
                <ChevronUp size={16} />
              </IconButton>
              <IconButton
                type="button"
                title="Move down"
                aria-label="Move down"
                disabled={disabled || index === forms.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDown size={16} />
              </IconButton>
              <IconButton
                type="button"
                title="Remove this form"
                aria-label="Remove this form"
                data-testid={`remove-form-${index}`}
                // A character must keep at least one form; removing the last
                // one is not "no traits", it is a character that cannot be
                // rendered.
                disabled={disabled || forms.length === 1}
                onClick={() =>
                  onChange(forms.filter((_, i) => i !== index))
                }
              >
                <Trash2 size={16} />
              </IconButton>
            </FormHead>
            {body}
          </FormCard>
        );
      })}

      {multiple && (
        <div>
          <Button
            type="button"
            variant="secondary"
            data-testid="add-form"
            disabled={disabled || forms.length >= maxForms}
            onClick={() => onChange([...forms, newFormDraft()])}
          >
            <Plus size={16} /> Add a form
          </Button>
          <Help>
            {forms.length >= maxForms
              ? `This rarity allows ${maxForms} forms, which this character has.`
              : `This rarity allows up to ${maxForms} forms.`}
          </Help>
        </div>
      )}
    </Forms>
  );
};
