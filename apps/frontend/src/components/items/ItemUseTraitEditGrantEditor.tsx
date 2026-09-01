import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import { Button } from "@chardb/ui";
import {
  useSpeciesQuery,
  useSetItemTypeTraitEditGrantMutation,
  type ItemTypeFieldsFragment,
} from "../../generated/graphql";
import { TraitEditGrantSpeciesRow } from "./TraitEditGrantSpeciesRow";

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

/** Which species are ticked, and which variants each is narrowed to. */
export type GrantDraft = Record<string, { on: boolean; variantIds: string[] }>;

/**
 * Which characters an edit kit of this type can change.
 *
 * Two levels rather than the MYO editor's one, because a kit names several
 * species. Ticking a species with no variants selected covers **every**
 * variant of it, which is the ordinary kit and therefore the state you get by
 * ticking and stopping.
 */
export const ItemUseTraitEditGrantEditor: React.FC<Props> = ({
  itemType,
  communityId,
}) => {
  const { data: speciesData } = useSpeciesQuery({ variables: { first: 100 } });
  const [save, { loading }] = useSetItemTypeTraitEditGrantMutation();

  const [draft, setDraft] = useState<GrantDraft>(() =>
    Object.fromEntries(
      (itemType.useTraitEditGrant?.species ?? []).map((entry) => [
        entry.species.id,
        { on: true, variantIds: entry.variants.map((v) => v.id) },
      ]),
    ),
  );

  const species = useMemo(
    () =>
      (speciesData?.species?.nodes ?? []).filter(
        (s) => s.communityId === communityId,
      ),
    [speciesData, communityId],
  );

  if (!itemType.isConsumable) {
    return (
      <Wrap data-testid="trait-edit-grant-editor">
        <Head>Edits on use</Head>
        <Hint>
          Only a consumable item can edit traits. Spending it is what uses it
          up, and without that the same item could buy an edit over and over.
        </Hint>
      </Wrap>
    );
  }

  const onSave = async () => {
    const chosen = Object.entries(draft)
      .filter(([, v]) => v.on)
      .map(([speciesId, v]) => ({
        speciesId,
        speciesVariantIds: v.variantIds,
      }));

    try {
      await save({
        variables: { input: { itemTypeId: itemType.id, species: chosen } },
      });
      toast.success(
        chosen.length ? "Edits on use saved" : "Edits on use cleared",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that");
    }
  };

  return (
    <Wrap data-testid="trait-edit-grant-editor">
      <Head>Edits on use</Head>
      <Hint>
        Spending one destroys it and lets its holder propose a change to one of
        their characters&rsquo; traits, which then goes to trait review. Tick
        the species it works on; leave a species&rsquo; variants unticked to
        cover all of them. Untick everything to clear it. An item type does one
        thing when used, so this cannot sit beside a payout or an MYO grant.
      </Hint>

      {species.length === 0 ? (
        <Hint>This community has no species yet.</Hint>
      ) : (
        species.map((s) => (
          <TraitEditGrantSpeciesRow
            key={s.id}
            species={s}
            state={draft[s.id] ?? { on: false, variantIds: [] }}
            onChange={(next) => setDraft((prev) => ({ ...prev, [s.id]: next }))}
          />
        ))
      )}

      <Actions>
        <Button
          size="sm"
          onClick={onSave}
          disabled={loading}
          data-testid="save-trait-edit-grant"
        >
          {loading ? "Saving…" : "Save edits on use"}
        </Button>
      </Actions>
    </Wrap>
  );
};
