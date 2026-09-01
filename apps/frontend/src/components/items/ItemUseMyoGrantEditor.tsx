import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import { Button } from "@chardb/ui";
import {
  useSpeciesQuery,
  useSpeciesVariantsBySpeciesQuery,
  useSetItemTypeMyoGrantMutation,
  type ItemTypeFieldsFragment,
} from "../../generated/graphql";

const Wrap = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: 0.9rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
`;

const Head = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Hint = styled.p`
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Select = styled.select`
  width: 100%;
  padding: 0.4rem 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
`;

const Row = styled.label`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.3rem 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

interface Props {
  itemType: ItemTypeFieldsFragment;
  communityId: string;
}

/**
 * Which characters a ticket of this type makes.
 *
 * Consumable-only, and it says why rather than hiding, exactly as the payout
 * editor does: redeeming is what uses the ticket up, and a ticket that
 * survived redemption would make a character every time it was submitted.
 *
 * Species are narrowed to this community. A ticket that could make another
 * community's species is the cross-community hole; the server refuses it, and
 * offering it here would only mean explaining the refusal afterwards.
 */
export const ItemUseMyoGrantEditor: React.FC<Props> = ({
  itemType,
  communityId,
}) => {
  const { data: speciesData } = useSpeciesQuery({ variables: { first: 100 } });
  const [save, { loading }] = useSetItemTypeMyoGrantMutation();

  const [speciesId, setSpeciesId] = useState<string>(
    itemType.useMyoGrant?.species.id ?? "",
  );
  const [variantIds, setVariantIds] = useState<string[]>(
    itemType.useMyoGrant?.variants.map((v) => v.id) ?? [],
  );

  const species = useMemo(
    () =>
      (speciesData?.species?.nodes ?? []).filter(
        (s) => s.communityId === communityId,
      ),
    [speciesData, communityId],
  );

  const { data: variantsData } = useSpeciesVariantsBySpeciesQuery({
    variables: { speciesId, first: 50 },
    skip: !speciesId,
  });
  const variants = variantsData?.speciesVariantsBySpecies?.nodes ?? [];

  if (!itemType.isConsumable) {
    return (
      <Wrap data-testid="myo-grant-editor">
        <Head>Makes on use</Head>
        <Hint>
          Only a consumable item can make a character. Redeeming is what uses
          the ticket up, and without that the same ticket could make a
          character over and over.
        </Hint>
      </Wrap>
    );
  }

  const onSave = async () => {
    try {
      await save({
        variables: {
          input: {
            itemTypeId: itemType.id,
            speciesId: speciesId || undefined,
            speciesVariantIds: variantIds,
          },
        },
      });
      toast.success(variantIds.length ? "MYO grant saved" : "MYO grant cleared");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that");
    }
  };

  return (
    <Wrap data-testid="myo-grant-editor">
      <Head>Makes on use</Head>
      <Hint>
        Redeeming one destroys it and lets its holder make a character of one of
        the variants you tick, with its traits pending review. Untick everything
        to clear it. An item type cannot both pay out and make characters.
      </Hint>

      {species.length === 0 ? (
        <Hint>This community has no species yet.</Hint>
      ) : (
        <>
          <Select
            value={speciesId}
            data-testid="myo-grant-species"
            onChange={(e) => {
              setSpeciesId(e.target.value);
              // A variant of the old species is not a variant of the new one.
              setVariantIds([]);
            }}
          >
            <option value="">Select a species…</option>
            {species.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          {speciesId &&
            (variants.length === 0 ? (
              <Hint>That species has no variants to offer.</Hint>
            ) : (
              variants.map((variant) => (
                <Row key={variant.id}>
                  <input
                    type="checkbox"
                    checked={variantIds.includes(variant.id)}
                    data-testid={`myo-grant-variant-${variant.id}`}
                    onChange={(e) =>
                      setVariantIds((prev) =>
                        e.target.checked
                          ? [...prev, variant.id]
                          : prev.filter((id) => id !== variant.id),
                      )
                    }
                  />
                  <span>{variant.name}</span>
                </Row>
              ))
            ))}
        </>
      )}

      <Actions>
        <Button
          size="sm"
          onClick={onSave}
          disabled={loading}
          data-testid="save-myo-grant"
        >
          {loading ? "Saving…" : "Save MYO grant"}
        </Button>
      </Actions>
    </Wrap>
  );
};
