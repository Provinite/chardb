import React, { useMemo } from "react";
import styled from "styled-components";
import { TraitDiffDisplay } from "./TraitDiffDisplay";

type TraitValue = React.ComponentProps<
  typeof TraitDiffDisplay
>["proposedTraitValues"][number];

export interface FormSnapshot {
  formId: string;
  name: string;
  sortOrder: number;
  traitValues: TraitValue[];
}

const Forms = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const FormBlock = styled.div``;

const FormHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const FormName = styled.h4`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const FormStatus = styled.span<{ $kind: "added" | "removed" }>`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme, $kind }) =>
    $kind === "added" ? theme.colors.success : theme.colors.error};
`;

interface Props {
  previousForms: FormSnapshot[];
  proposedForms: FormSnapshot[];
  speciesId?: string | null;
  speciesVariantId?: string | null;
}

/**
 * A trait review's diff, form by form.
 *
 * Forms are paired by `formId`, which is what makes "Awakened's eyes changed"
 * distinguishable from "the Awakened form was removed and a different one
 * added". A proposal that adds a form carries an id nothing on the character
 * matches, so it lands as an addition -- correctly, since that is what it is.
 *
 * The heading and the per-form status only appear when there is more than one
 * form on either side. A review of an ordinary single-form character reads
 * exactly as it did before forms existed, which is what keeps the queue quick
 * for the communities that never use them.
 */
export const FormDiffDisplay: React.FC<Props> = ({
  previousForms,
  proposedForms,
  speciesId,
  speciesVariantId,
}) => {
  const rows = useMemo(() => {
    const previousById = new Map(previousForms.map((f) => [f.formId, f]));
    const proposedById = new Map(proposedForms.map((f) => [f.formId, f]));

    // Proposed order first, because that is the order the character will be
    // in if this is approved. Removed forms follow, so a reviewer sees what
    // is going as well as what is arriving.
    const ordered = [
      ...proposedForms.map((form) => ({
        key: form.formId,
        name: form.name,
        previous: previousById.get(form.formId)?.traitValues ?? [],
        proposed: form.traitValues,
        status: previousById.has(form.formId) ? null : ("added" as const),
      })),
      ...previousForms
        .filter((form) => !proposedById.has(form.formId))
        .map((form) => ({
          key: form.formId,
          name: form.name,
          previous: form.traitValues,
          proposed: [],
          status: "removed" as const,
        })),
    ];
    return ordered;
  }, [previousForms, proposedForms]);

  const multiple = previousForms.length > 1 || proposedForms.length > 1;

  return (
    <Forms data-testid="form-diff">
      {rows.map((row) => (
        <FormBlock key={row.key} data-testid={`form-diff-${row.key}`}>
          {multiple && (
            <FormHead>
              <FormName>{row.name}</FormName>
              {row.status && (
                <FormStatus $kind={row.status}>
                  {row.status === "added" ? "New form" : "Form removed"}
                </FormStatus>
              )}
            </FormHead>
          )}
          <TraitDiffDisplay
            previousTraitValues={row.previous}
            proposedTraitValues={row.proposed}
            speciesId={speciesId}
            speciesVariantId={speciesVariantId}
          />
        </FormBlock>
      ))}
    </Forms>
  );
};
