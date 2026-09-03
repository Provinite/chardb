import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import { Button } from "@chardb/ui";
import {
  useSpeciesQuery,
  useSpeciesVariantsBySpeciesQuery,
  useSetItemTypeVariantChangeGrantMutation,
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

const Label = styled.div`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.3rem;
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

const Row = styled.label<{ $muted?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.3rem 0;
  font-size: 0.875rem;
  color: ${({ theme, $muted }) =>
    $muted ? theme.colors.text.muted : theme.colors.text.primary};
  cursor: ${({ $muted }) => ($muted ? "default" : "pointer")};
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
 * Where an item of this type moves a character, and what it can be spent on.
 *
 * Two halves, deliberately asymmetric. One destination, picked from a list, so
 * the member never chooses and the confirm can say what the character becomes;
 * a set of sources, ticked, because "spendable on a Common or an Uncommon" is
 * the shape actually sold.
 *
 * **Ticking nothing means every variant**, including a character with no
 * variant set. That is the permissive case rather than the broken one, which
 * is why it is spelled out here instead of being left to be discovered.
 *
 * The destination cannot also be a source: an item that turns a Rare into a
 * Rare does nothing, and the holder would find that out after spending it. Its
 * checkbox is shown disabled rather than hidden, so the reason is visible.
 *
 * Called a variant change and not an upgrade, because nothing here can tell
 * one from the other — variants have names, not ranks, so this configures a
 * demotion exactly as happily. The item's own name is what a member sees.
 */
export const ItemUseVariantChangeGrantEditor: React.FC<Props> = ({
  itemType,
  communityId,
}) => {
  const { data: speciesData } = useSpeciesQuery({ variables: { first: 100 } });
  const [save, { loading }] = useSetItemTypeVariantChangeGrantMutation();

  const grant = itemType.useVariantChangeGrant;

  const [speciesId, setSpeciesId] = useState<string>(grant?.species.id ?? "");
  const [toVariantId, setToVariantId] = useState<string>(
    grant?.toVariant.id ?? "",
  );
  const [fromVariantIds, setFromVariantIds] = useState<string[]>(
    grant?.fromVariants.map((v) => v.id) ?? [],
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
      <Wrap data-testid="variant-change-grant-editor">
        <Head>Changes variant on use</Head>
        <Hint>
          Only a consumable item can change a variant. Redeeming is what uses it
          up, and without that the same item could move a character over and
          over.
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
            toVariantId: toVariantId || null,
            // The destination is never also a source. Filtered here as well
            // as disabled above, so a stale tick left over from changing the
            // destination cannot be submitted.
            fromVariantIds: fromVariantIds.filter((id) => id !== toVariantId),
          },
        },
      });
      toast.success(
        toVariantId ? "Variant change saved" : "Variant change cleared",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that");
    }
  };

  return (
    <Wrap data-testid="variant-change-grant-editor">
      <Head>Changes variant on use</Head>
      <Hint>
        Redeeming one destroys it and moves one of its holder&rsquo;s characters
        to the variant you pick. The change applies straight away, with no
        review. Clear the destination to remove it. An item type does one thing
        when redeemed, so this cannot sit beside a payout, an MYO grant or an
        edit kit grant.
      </Hint>

      {species.length === 0 ? (
        <Hint>This community has no species yet.</Hint>
      ) : (
        <>
          <Label>Species</Label>
          <Select
            value={speciesId}
            data-testid="variant-change-grant-species"
            onChange={(e) => {
              setSpeciesId(e.target.value);
              // A variant of the old species is not a variant of the new one.
              setToVariantId("");
              setFromVariantIds([]);
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
              <>
                <Label>Becomes</Label>
                <Select
                  value={toVariantId}
                  data-testid="variant-change-grant-to"
                  onChange={(e) => {
                    setToVariantId(e.target.value);
                    setFromVariantIds((prev) =>
                      prev.filter((id) => id !== e.target.value),
                    );
                  }}
                >
                  <option value="">Nothing — clears this</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </Select>

                {toVariantId && (
                  <>
                    <Label>Spendable on</Label>
                    <Hint>
                      Tick the variants it works on. Tick none to cover every
                      variant of the species, including characters with none
                      set.
                    </Hint>
                    {variants.map((variant) => {
                      const isDestination = variant.id === toVariantId;
                      return (
                        <Row key={variant.id} $muted={isDestination}>
                          <input
                            type="checkbox"
                            checked={fromVariantIds.includes(variant.id)}
                            disabled={isDestination}
                            data-testid={`variant-change-grant-from-${variant.id}`}
                            onChange={(e) =>
                              setFromVariantIds((prev) =>
                                e.target.checked
                                  ? [...prev, variant.id]
                                  : prev.filter((id) => id !== variant.id),
                              )
                            }
                          />
                          <span>
                            {variant.name}
                            {isDestination ? " — this is the destination" : ""}
                          </span>
                        </Row>
                      );
                    })}
                  </>
                )}
              </>
            ))}
        </>
      )}

      <Actions>
        <Button
          size="sm"
          onClick={onSave}
          disabled={loading}
          data-testid="save-variant-change-grant"
        >
          {loading ? "Saving…" : "Save variant change"}
        </Button>
      </Actions>
    </Wrap>
  );
};
