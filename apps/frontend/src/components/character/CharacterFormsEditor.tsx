import React, { useEffect } from "react";
import styled from "styled-components";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button, Input } from "@chardb/ui";
import { TraitForm } from "./TraitForm";
import {
  newFormDraft,
  unnamedForms,
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
  /* Start rather than center: the name field grows a validation line under it,
     and centering would drag the buttons down with it. */
  align-items: flex-start;
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

const PrimaryBadge = styled.span`
  flex-shrink: 0;
  padding: 0.2rem 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: ${({ theme }) => theme.colors.primary}18;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const NameError = styled.p`
  margin: ${({ theme }) => theme.spacing.xs} 0 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.error};
`;

const Help = styled.p`
  margin: ${({ theme }) => theme.spacing.sm} 0 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

/**
 * What the editor says about the limit.
 *
 * The over-limit case is real rather than defensive: staff can lower a
 * variant's limit, and characters that already have more forms keep them
 * rather than being silently trimmed. Somebody then has to remove one before
 * the next save, and this is where they find that out -- the server refuses it
 * either way, but not until they have pressed Save.
 */
function limitMessage(count: number, maxForms: number): string {
  const allowance = maxForms === 1 ? "one form" : `${maxForms} forms`;
  if (count > maxForms) {
    return `This rarity allows ${allowance}. Remove ${count - maxForms} before saving.`;
  }
  if (count === maxForms) {
    return `This rarity allows ${allowance}, which this character has.`;
  }
  return `This rarity allows up to ${allowance}.`;
}

interface Props {
  forms: CharacterFormDraft[];
  onChange: (forms: CharacterFormDraft[]) => void;
  /** From the variant. One means this character does not do forms. */
  maxForms: number;
  speciesId: string;
  speciesVariant: SpeciesVariantDetailsFragment | null;
  disabled?: boolean;
  /**
   * How many forms still need a name, so the page owning the Save button can
   * block on it. Reported upward rather than handled here for the reason the
   * stranded-trait count is: this component does not own the submit.
   */
  onUnnamedChange?: (count: number) => void;
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
  onUnnamedChange,
}) => {
  const multiple = maxForms > 1 || forms.length > 1;
  const unnamed = unnamedForms(forms);

  useEffect(() => {
    onUnnamedChange?.(unnamed);
  }, [unnamed, onUnnamedChange]);

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
              {/* Which form is primary is otherwise invisible -- it is simply
                  the one at the top -- and reordering silently changes what
                  every listing and every link to this character shows. */}
              {index === 0 && (
                <PrimaryBadge
                  data-testid="primary-form-badge"
                  title="Shown in listings and when somebody opens this character"
                >
                  Primary
                </PrimaryBadge>
              )}
              <NameField>
                <Input
                  value={form.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  placeholder="Form name, e.g. Awakened"
                  disabled={disabled}
                  maxLength={100}
                  required
                  hasError={!form.name.trim()}
                  data-testid={`form-name-${index}`}
                  aria-label={`Name of form ${index + 1}`}
                />
                {!form.name.trim() && (
                  <NameError data-testid={`form-name-error-${index}`}>
                    Give this form a name &mdash; it is what the tabs on the
                    character page say.
                  </NameError>
                )}
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
                onClick={() => onChange(forms.filter((_, i) => i !== index))}
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
          <Help>{limitMessage(forms.length, maxForms)}</Help>
        </div>
      )}
    </Forms>
  );
};
