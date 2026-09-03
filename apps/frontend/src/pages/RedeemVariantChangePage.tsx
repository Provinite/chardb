import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import styled from "styled-components";
import { AlertTriangle, ArrowLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@chardb/ui";
import {
  useGetCharacterQuery,
  useGetMyVariantChangeItemsQuery,
  useChangeCharacterVariantWithItemMutation,
  useSpeciesWithTraitsAndEnumValuesQuery,
  useEnumValueSettingsBySpeciesVariantQuery,
  type CharacterTraitValueInput,
} from "../generated/graphql";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  variantItemUsableOn,
  redundantOn,
  strandedValues,
} from "../lib/variantChangeItems";

/** Same shape the inventory uses, so one date reads the same in both places. */
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.875rem;
  cursor: pointer;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 1.5rem 0;
`;

const Panel = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.primary}40;
  background: ${({ theme }) => theme.colors.primary}0d;
  border-radius: 8px;
  padding: 1rem 1.15rem;
  margin-bottom: 2rem;
`;

const PanelHead = styled.h2`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.35rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Note = styled.p`
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Move = styled.p`
  margin: 0 0 0.75rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
`;

const Reroute = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.warning};
  border-radius: 8px;
  padding: 1rem 1.15rem;
  background: ${({ theme }) => theme.colors.warning}12;
  margin-bottom: 2rem;
`;

const RerouteHead = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.35rem;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  align-items: center;
  padding: 0.6rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Was = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};

  span {
    display: block;
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

/**
 * Redeeming an item to move one character to another variant.
 *
 * Its own page rather than a mode on the character edit form, for the reason
 * the edit-kit page gives: that form is gated on registry permissions this
 * exists to substitute for, and it edits a registry id this must not touch.
 *
 * Reached two ways, both landing here:
 *   /character/:characterId/change-variant             (from the character)
 *   /character/:characterId/change-variant?item=<id>   (from the item)
 *
 * **There is no variant picker.** The item names one destination, so the only
 * choice on this page is whether to go through with it — and, when the
 * destination does not permit a marking the character currently has, what that
 * marking should become instead. That re-pick is the whole reason this is a
 * page and not a confirm dialog.
 */
export const RedeemVariantChangePage: React.FC = () => {
  const { characterId } = useParams<{ characterId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: characterData, loading: characterLoading } =
    useGetCharacterQuery({
      variables: { id: characterId! },
      skip: !characterId,
      fetchPolicy: "network-only",
    });
  const character = characterData?.character ?? null;

  const { data: itemsData, loading: itemsLoading } =
    useGetMyVariantChangeItemsQuery({
      variables: {
        communityId: character?.species?.communityId ?? "",
        userId: user?.id ?? "",
      },
      skip: !character?.species?.communityId || !user?.id,
      fetchPolicy: "network-only",
    });

  /**
   * Every individual item the member holds that would move this character.
   *
   * Items already at their destination are left out rather than offered and
   * refused — an item that moves a Common to Rare is not an option for a
   * character that is already Rare, and listing it would put the refusal after
   * the choice.
   */
  const eligibleItems = useMemo(() => {
    if (!character) return [];
    return (itemsData?.memberHoldings?.holdings ?? [])
      .filter((h) => {
        const grant = h.itemType.useVariantChangeGrant;
        return grant ? variantItemUsableOn(grant, character) : false;
      })
      .flatMap((h) =>
        h.items.map((item) => ({
          id: item.id,
          typeId: h.itemType.id,
          name: h.itemType.name,
          acquiredAt: item.acquiredAt,
          grant: h.itemType.useVariantChangeGrant!,
        })),
      );
  }, [itemsData, character]);

  /**
   * Whether the member holds something that covers this character but is
   * pointed where it already is.
   *
   * Worth telling them apart. "You hold nothing for this character" and "you
   * hold one, but this character is already Rare" send a reader looking in
   * completely different places.
   */
  const holdsRedundant = useMemo(() => {
    if (!character) return false;
    return (itemsData?.memberHoldings?.holdings ?? []).some((h) => {
      const grant = h.itemType.useVariantChangeGrant;
      return grant ? redundantOn(grant, character) : false;
    });
  }, [itemsData, character]);

  const requestedItem = searchParams.get("item");
  /**
   * A *type* rather than a specific item, which is what the character page's
   * item list can name -- it groups by type, so it knows you picked "Rare
   * Thornwing Upgrade" and not which of your two copies.
   */
  const requestedType = searchParams.get("itemType");
  const [itemId, setItemId] = useState<string | null>(requestedItem);

  // Default to the only one when there is only one, or to the first of the
  // type that was asked for. A picker with one option is a step that cannot
  // go any other way, and a picker shown after the member already chose the
  // item is the same choice asked twice.
  useEffect(() => {
    if (itemId) return;
    if (requestedType) {
      const match = eligibleItems.find((i) => i.typeId === requestedType);
      if (match) {
        setItemId(match.id);
        return;
      }
    }
    if (eligibleItems.length === 1) setItemId(eligibleItems[0].id);
  }, [itemId, requestedType, eligibleItems]);

  const chosen = eligibleItems.find((i) => i.id === itemId) ?? null;
  const destination = chosen?.grant.toVariant ?? null;

  const [confirming, setConfirming] = useState(false);

  const [traitValues, setTraitValues] = useState<CharacterTraitValueInput[]>(
    [],
  );
  const [seeded, setSeeded] = useState(false);

  // Seeded from what the character has now. Everything the destination
  // permits carries across untouched; the re-picking below is only for what
  // it does not.
  useEffect(() => {
    if (seeded || !character) return;
    setTraitValues(
      (character.traitValues ?? []).map((tv) => ({
        traitId: tv.traitId,
        value: tv.value,
        ...(tv.clarifier ? { clarifier: tv.clarifier } : {}),
      })),
    );
    setSeeded(true);
  }, [character, seeded]);

  // Traits and their options in one query rather than one per trait.
  const { data: speciesData } = useSpeciesWithTraitsAndEnumValuesQuery({
    variables: { speciesId: character?.speciesId ?? "" },
    skip: !character?.speciesId,
  });
  const traits = useMemo(
    () => speciesData?.speciesById?.traits ?? [],
    [speciesData],
  );

  const { data: settingsData } = useEnumValueSettingsBySpeciesVariantQuery({
    variables: { speciesVariantId: destination?.id ?? "", first: 500 },
    skip: !destination,
  });

  /** What the destination permits. Empty permits nothing — see the lib. */
  const allowed = useMemo(
    () =>
      new Set(
        settingsData?.enumValueSettingsBySpeciesVariant?.nodes?.map(
          (s) => s.enumValueId,
        ) ?? [],
      ),
    [settingsData],
  );

  /** Every enum option this species has, by id, so a value can be named. */
  const optionsById = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; traitId: string; traitName: string }
    >();
    for (const trait of traits) {
      for (const option of trait.enumValues ?? []) {
        map.set(option.id, {
          id: option.id,
          name: option.name,
          traitId: trait.id,
          traitName: trait.name,
        });
      }
    }
    return map;
  }, [traits]);

  const stranded = useMemo(() => {
    // Nothing to say until the destination's allow-list has actually loaded.
    // Treating "not loaded yet" as "permits nothing" would flash a warning
    // naming every trait the character has.
    if (!destination || !settingsData) return [];
    return strandedValues(traitValues, allowed, optionsById);
  }, [destination, settingsData, traitValues, allowed, optionsById]);

  /** Replace one stranded value, or drop it when `to` is empty. */
  const reroute = (index: number, to: string) => {
    setTraitValues(
      to
        ? traitValues.map((tv, i) => (i === index ? { ...tv, value: to } : tv))
        : traitValues.filter((_, i) => i !== index),
    );
  };

  const [redeem, { loading: redeeming }] =
    useChangeCharacterVariantWithItemMutation({
      update: (cache) => {
        cache.evict({ fieldName: "memberHoldings" });
        cache.evict({ fieldName: "character" });
        cache.gc();
      },
      onCompleted: () => {
        setConfirming(false);
        toast.success(
          destination
            ? `${character?.name} is now ${destination.name}.`
            : "Done.",
        );
        navigate(`/character/${characterId}`);
      },
      onError: (error) => {
        setConfirming(false);
        toast.error(error.message);
      },
    });

  if (characterLoading || itemsLoading) return <LoadingSpinner />;

  if (!character) {
    return (
      <Container>
        <p data-testid="variant-change-unusable">
          That character does not exist.
        </p>
      </Container>
    );
  }

  const isOwner = character.owner?.id === user?.id;
  const pending = character.traitReviewStatus === "PENDING";

  // Every reason this page cannot do anything, said before the member works
  // through a form. The server refuses all of them too; this is about
  // refusing where it costs nothing rather than after the effort.
  const blocked = !isOwner
    ? "That character is not yours."
    : pending
      ? "That character has a change awaiting review. It can be moved once that is resolved."
      : eligibleItems.length === 0
        ? holdsRedundant
          ? `${character.name} is already the variant your item grants, so there is nothing for it to change.`
          : "You do not hold an item that can change this character's variant."
        : null;

  if (blocked) {
    return (
      <Container>
        <BackButton type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </BackButton>
        <Title>Change {character.name}&rsquo;s variant</Title>
        <p data-testid="variant-change-unusable">{blocked}</p>
      </Container>
    );
  }

  const onConfirm = async () => {
    if (!itemId) return;
    await redeem({
      variables: {
        input: { itemId, characterId: character.id, traitValues },
      },
    });
  };

  return (
    <Container>
      <BackButton type="button" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} />
        Back
      </BackButton>

      <Title>Change {character.name}&rsquo;s variant</Title>

      <Panel data-testid="variant-change-panel">
        {/* Named, not called an "upgrade ticket". That is our word for the
            feature; the community called the item something, and that is what
            its holder recognises. */}
        <PanelHead>
          <ArrowUpRight size={20} />
          {chosen
            ? `Redeeming your ${chosen.name}`
            : `Changing ${character.name}'s variant`}
        </PanelHead>

        {destination && (
          <Move data-testid="variant-change-move">
            <strong>{character.name}</strong> becomes{" "}
            <strong>{destination.name}</strong>
            {character.speciesVariant?.name
              ? `, from ${character.speciesVariant.name}.`
              : "."}
          </Move>
        )}

        <Note>
          Redeeming spends it and cannot be undone.{" "}
          <strong>The change happens straight away</strong> — there is no
          review, and no way to move {character.name} back without another item.
        </Note>

        {eligibleItems.length > 1 ? (
          <Select
            value={itemId ?? ""}
            data-testid="variant-change-select"
            onChange={(e) => setItemId(e.target.value || null)}
          >
            <option value="">Pick which one to redeem…</option>
            {eligibleItems.map((item, i) => (
              <option key={item.id} value={item.id}>
                {item.name} #{i + 1} &rarr; {item.grant.toVariant.name}
              </option>
            ))}
          </Select>
        ) : (
          <Note data-testid="variant-change-only">
            Redeeming your <strong>{eligibleItems[0]?.name}</strong>.
          </Note>
        )}
      </Panel>

      {stranded.length > 0 && (
        <Reroute data-testid="variant-change-reroute">
          <RerouteHead>
            <AlertTriangle size={18} />
            {stranded.length === 1
              ? `One trait value does not exist at ${destination?.name}`
              : `${stranded.length} trait values do not exist at ${destination?.name}`}
          </RerouteHead>
          <Note style={{ marginBottom: "0.5rem" }}>
            Pick what each should become, or remove it. This cannot be redeemed
            while any is unresolved &mdash; the server refuses it too.
          </Note>

          {stranded.map((row) => {
            const trait = traits.find((t) => t.id === row.traitId);
            const choices = (trait?.enumValues ?? []).filter((ev) =>
              allowed.has(ev.id),
            );
            return (
              <Row key={`${row.traitId}-${row.index}`}>
                <Was>
                  {row.traitName}
                  <span>currently {row.optionName}</span>
                </Was>
                <Select
                  data-testid={`variant-change-reroute-${row.traitId}`}
                  defaultValue=""
                  onChange={(e) => reroute(row.index, e.target.value)}
                >
                  <option value="" disabled>
                    Choose a replacement…
                  </option>
                  {choices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="">Remove this value</option>
                </Select>
              </Row>
            );
          })}
        </Reroute>
      )}

      <ButtonRow>
        <Button
          onClick={() => setConfirming(true)}
          disabled={redeeming || !itemId || stranded.length > 0}
          data-testid="submit-variant-change"
        >
          {redeeming
            ? "Redeeming…"
            : chosen
              ? `Redeem ${chosen.name}`
              : "Redeem it"}
        </Button>
      </ButtonRow>

      {/* Names the item and when it reached them, because "are you sure?"
          about an unnamed thing is a question nobody can answer. The date is
          the ledger's, not the item's creation -- see Item.acquiredAt. */}
      <ConfirmDialog
        open={confirming}
        title={chosen ? `Redeem your ${chosen.name}?` : "Redeem this item?"}
        confirmLabel="Redeem it"
        busyLabel="Redeeming…"
        busy={redeeming}
        destructive
        testId="redeem-variant-change-dialog"
        onCancel={() => setConfirming(false)}
        onConfirm={() => void onConfirm()}
      >
        {chosen && destination && (
          <>
            Redeeming your <strong>{chosen.name}</strong>
            {chosen.acquiredAt
              ? `, acquired ${formatDate(chosen.acquiredAt)},`
              : ""}{" "}
            to make <strong>{character.name}</strong> {destination.name}. This
            happens straight away and cannot be undone.
          </>
        )}
      </ConfirmDialog>
    </Container>
  );
};
