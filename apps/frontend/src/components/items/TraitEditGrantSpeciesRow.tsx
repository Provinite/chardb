import React from "react";
import styled from "styled-components";
import {
  useSpeciesVariantsBySpeciesQuery,
  type SpeciesDetailsFragment,
} from "../../generated/graphql";

const Row = styled.div`
  padding: 0.4rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-of-type {
    border-bottom: none;
  }
`;

const Line = styled.label`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
`;

const Variants = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.45rem 0 0.2rem 1.7rem;
`;

const VariantLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`;

const AllNote = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  padding-left: 1.7rem;
`;

interface Props {
  species: SpeciesDetailsFragment;
  state: { on: boolean; variantIds: string[] };
  onChange: (next: { on: boolean; variantIds: string[] }) => void;
}

/**
 * One species in the edit-kit grant, with its variants underneath.
 *
 * Its own component because the variant list is a query per species, and a
 * hook cannot be called in a loop. Variants load only for a ticked species,
 * so an unticked one costs nothing.
 *
 * The "every variant" state is stated rather than left as an empty list the
 * reader has to interpret: an unticked variant row is the difference between
 * a kit for the whole species and a kit for two of its rarities, and that is
 * not something to leave implicit on a form that sells things.
 */
export const TraitEditGrantSpeciesRow: React.FC<Props> = ({
  species,
  state,
  onChange,
}) => {
  const { data } = useSpeciesVariantsBySpeciesQuery({
    variables: { speciesId: species.id, first: 50 },
    skip: !state.on,
  });
  const variants = data?.speciesVariantsBySpecies?.nodes ?? [];

  return (
    <Row data-species-id={species.id}>
      <Line>
        <input
          type="checkbox"
          checked={state.on}
          data-testid={`trait-edit-species-${species.id}`}
          onChange={(e) =>
            onChange({ on: e.target.checked, variantIds: [] })
          }
        />
        <span>{species.name}</span>
      </Line>

      {state.on &&
        (variants.length === 0 ? (
          <AllNote>No variants configured.</AllNote>
        ) : (
          <>
            <Variants>
              {variants.map((variant) => (
                <VariantLabel key={variant.id}>
                  <input
                    type="checkbox"
                    checked={state.variantIds.includes(variant.id)}
                    data-testid={`trait-edit-variant-${variant.id}`}
                    onChange={(e) =>
                      onChange({
                        on: true,
                        variantIds: e.target.checked
                          ? [...state.variantIds, variant.id]
                          : state.variantIds.filter((id) => id !== variant.id),
                      })
                    }
                  />
                  {variant.name}
                </VariantLabel>
              ))}
            </Variants>
            {state.variantIds.length === 0 && (
              <AllNote data-testid={`trait-edit-all-variants-${species.id}`}>
                Covers every variant, including characters with none set.
              </AllNote>
            )}
          </>
        ))}
    </Row>
  );
};
