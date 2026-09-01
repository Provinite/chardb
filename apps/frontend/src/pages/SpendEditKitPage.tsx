import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import styled from "styled-components";
import { ArrowLeft, Wrench } from "lucide-react";
import { Button } from "@chardb/ui";
import {
  useGetCharacterQuery,
  useGetMyEditKitsQuery,
  useEditCharacterTraitsWithKitMutation,
  type CharacterTraitValueInput,
} from "../generated/graphql";
import { useAuth } from "../contexts/AuthContext";
import { TraitForm } from "../components/character/TraitForm";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { kitCovers } from "../lib/editKits";

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

const Select = styled.select`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
`;

const Section = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

/**
 * Spending an edit kit on one character's traits.
 *
 * Its own page rather than a mode on the character edit form. That form is
 * gated on registry permissions the kit exists to substitute for, and it edits
 * a registry id and a variant that a kit must not touch — reusing it would
 * mean disabling most of it and hoping nothing slipped through.
 *
 * Reached two ways, both landing here:
 *   /character/:characterId/edit-traits            (from the character)
 *   /character/:characterId/edit-traits?kit=<id>   (from the kit)
 *
 * With no `kit` the page offers the eligible kits the member holds; with one
 * it is fixed. Either way nothing is spent until submit.
 */
export const SpendEditKitPage: React.FC = () => {
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

  const { data: kitsData, loading: kitsLoading } = useGetMyEditKitsQuery({
    variables: {
      communityId: character?.species?.communityId ?? "",
      userId: user?.id ?? "",
    },
    skip: !character?.species?.communityId || !user?.id,
    fetchPolicy: "network-only",
  });

  /** Every individual kit the member holds that covers this character. */
  const eligibleKits = useMemo(() => {
    if (!character) return [];
    return (kitsData?.memberHoldings?.holdings ?? [])
      .filter((h) => {
        const grant = h.itemType.useTraitEditGrant;
        return grant ? kitCovers(grant, character) : false;
      })
      .flatMap((h) =>
        h.items.map((item) => ({
          id: item.id,
          name: h.itemType.name,
          acquiredAt: item.acquiredAt,
        })),
      );
  }, [kitsData, character]);

  const requestedKit = searchParams.get("kit");
  const [kitId, setKitId] = useState<string | null>(requestedKit);

  // Default to the only kit when there is only one. A picker with one option
  // is a step that cannot go any other way.
  useEffect(() => {
    if (kitId || eligibleKits.length !== 1) return;
    setKitId(eligibleKits[0].id);
  }, [kitId, eligibleKits]);

  /** The kit actually being spent, so the page can call it by its name. */
  const chosenKit = eligibleKits.find((k) => k.id === kitId) ?? null;

  /**
   * Whether the confirm is open.
   *
   * Redeeming destroys the kit and there is no un-redeem, so it never happens
   * on a single click -- the same rule the payout redemption and the shop's
   * refunds follow.
   */
  const [confirming, setConfirming] = useState(false);

  const [traitValues, setTraitValues] = useState<CharacterTraitValueInput[]>(
    [],
  );
  const [seeded, setSeeded] = useState(false);

  // Seeded from what the character has now, so the form opens on the current
  // design rather than an empty sheet — this is an edit, not a redesign.
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

  const [spend, { loading: spending }] = useEditCharacterTraitsWithKitMutation({
    update: (cache) => {
      cache.evict({ fieldName: "memberHoldings" });
      cache.evict({ fieldName: "character" });
      cache.gc();
    },
    onCompleted: () => {
      setConfirming(false);
      toast.success(
        chosenKit
          ? `Sent to staff for review. Your ${chosenKit.name} has been spent.`
          : "Sent to staff for review. Your item has been spent.",
      );
      navigate(`/character/${characterId}`);
    },
    onError: (error) => {
      setConfirming(false);
      toast.error(error.message);
    },
  });

  if (characterLoading || kitsLoading) return <LoadingSpinner />;

  if (!character) {
    return (
      <Container>
        <p data-testid="edit-kit-unusable">That character does not exist.</p>
      </Container>
    );
  }

  const isOwner = character.owner?.id === user?.id;
  const pending = character.traitReviewStatus === "PENDING";

  // Every reason this page cannot do anything, said before the member fills
  // in a form. The server refuses all of them too; this is about refusing
  // where it costs nothing rather than after the work.
  const blocked = !isOwner
    ? "That character is not yours."
    : pending
      ? "That character already has a change awaiting review. Only one at a time."
      : eligibleKits.length === 0
        ? "You do not hold an item that can change this character's traits."
        : null;

  if (blocked) {
    return (
      <Container>
        <BackButton type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </BackButton>
        <Title>Edit {character.name}&rsquo;s traits</Title>
        <p data-testid="edit-kit-unusable">{blocked}</p>
      </Container>
    );
  }

  const onConfirm = async () => {
    if (!kitId) return;
    await spend({
      variables: {
        input: { itemId: kitId, characterId: character.id, traitValues },
      },
    });
  };

  return (
    <Container>
      <BackButton type="button" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} />
        Back
      </BackButton>

      <Title>Edit {character.name}&rsquo;s traits</Title>

      <Panel data-testid="edit-kit-panel">
        {/* Named, not called an "edit kit". That is our word for the feature;
            the community called the item something, and that is what its
            holder recognises. Falls back only when several are eligible and
            none is picked yet. */}
        <PanelHead>
          <Wrench size={20} />
          {chosenKit
            ? `Changing traits with your ${chosenKit.name}`
            : `Changing ${character.name}'s traits`}
        </PanelHead>
        <Note>
          Submitting spends it and cannot be undone.{" "}
          <strong>
            Nothing changes on {character.name} until staff approve it
          </strong>
          — the traits below are a proposal. If it is refused, it comes back.
        </Note>

        {eligibleKits.length > 1 ? (
          <Select
            value={kitId ?? ""}
            data-testid="edit-kit-select"
            onChange={(e) => setKitId(e.target.value || null)}
          >
            <option value="">Pick which one to spend…</option>
            {eligibleKits.map((kit, i) => (
              <option key={kit.id} value={kit.id}>
                {kit.name} #{i + 1}
              </option>
            ))}
          </Select>
        ) : (
          <Note data-testid="edit-kit-only">
            Spending your <strong>{eligibleKits[0]?.name}</strong>.
          </Note>
        )}
      </Panel>

      <Section>
        <TraitForm
          speciesId={character.speciesId!}
          speciesVariant={character.speciesVariant}
          traitValues={traitValues}
          onChange={setTraitValues}
        />
      </Section>

      <ButtonRow>
        <Button
          onClick={() => setConfirming(true)}
          disabled={spending || !kitId}
          data-testid="submit-edit-kit"
        >
          {spending
            ? "Spending…"
            : chosenKit
              ? `Spend ${chosenKit.name} and send for review`
              : "Spend it and send for review"}
        </Button>
      </ButtonRow>

      {/* Names the item and when it reached them, because "are you sure?"
          about an unnamed thing is a question nobody can answer. The date is
          the ledger's, not the item's creation -- see Item.acquiredAt. */}
      <ConfirmDialog
        open={confirming}
        title={
          chosenKit
            ? `Redeem your ${chosenKit.name}?`
            : "Redeem this item?"
        }
        confirmLabel="Redeem it"
        busyLabel="Redeeming…"
        busy={spending}
        destructive
        testId="redeem-edit-kit-dialog"
        onCancel={() => setConfirming(false)}
        onConfirm={() => void onConfirm()}
      >
        {chosenKit && (
          <>
            Redeeming your <strong>{chosenKit.name}</strong>
            {chosenKit.acquiredAt
              ? `, acquired ${formatDate(chosenKit.acquiredAt)},`
              : ""}{" "}
            to change <strong>{character.name}</strong>&rsquo;s traits. This
            cannot be undone. Nothing changes on {character.name} until staff
            approve it, and if they refuse, your kit comes back.
          </>
        )}
      </ConfirmDialog>
    </Container>
  );
};
