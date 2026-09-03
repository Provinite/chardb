import React, { useEffect, useMemo } from "react";
import styled from "styled-components";
import { AlertTriangle } from "lucide-react";
import { strandedValues } from "../../lib/variantChangeItems";
import {
  useSpeciesVariantsBySpeciesQuery,
  useSpeciesWithTraitsAndEnumValuesQuery,
  useEnumValueSettingsBySpeciesVariantQuery,
  type SpeciesVariantDetailsFragment,
  type CharacterTraitValueInput,
} from "../../generated/graphql";

const Wrap = styled.div`
  margin-bottom: 1.25rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 500;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.35rem;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
`;

const Help = styled.p`
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
`;

const Reroute = styled.div`
  margin-top: 1rem;
  border: 1px solid ${({ theme }) => theme.colors.warning};
  border-radius: 8px;
  padding: 1rem 1.15rem;
  background: ${({ theme }) => theme.colors.warning}12;
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

interface Props {
  speciesId: string;
  /** The variant the character has now. */
  currentVariantId: string | null;
  /** The variant staff has picked, which may be the current one. */
  selectedVariantId: string | null;
  onVariantChange: (variant: SpeciesVariantDetailsFragment | null) => void;
  traitValues: CharacterTraitValueInput[];
  onTraitValuesChange: (next: CharacterTraitValueInput[]) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  /** How many values still need re-routing. The parent blocks Save on it. */
  onUnresolvedChange: (count: number) => void;
  disabled?: boolean;
}

/**
 * Changing a character's rarity, and re-routing the traits that no longer fit.
 *
 * A variant is an allow-list: moving a character to a rarity that does not
 * permit one of its current markings leaves it holding a value its own trait
 * editor cannot offer. Refusing the change outright would be safe and useless
 * -- re-routing those values is precisely the work staff came to do -- so this
 * names each one and asks what it should become before the save is allowed.
 *
 * **An allow-list with no rows permits nothing.** A variant with no enum
 * settings is not "unconfigured, so anything goes" -- it is a variant nothing
 * can be, the same way one with no trait-list entries carries no traits.
 * `CharactersService.enumValueViolationsForVariant` reads it that way and
 * refuses every enum value, so reading it the other way here would show a
 * panel with nothing to re-route and then fail at save.
 */
export const VariantChangePanel: React.FC<Props> = ({
  speciesId,
  currentVariantId,
  selectedVariantId,
  onVariantChange,
  traitValues,
  onTraitValuesChange,
  reason,
  onReasonChange,
  onUnresolvedChange,
  disabled,
}) => {
  const { data: variantsData } = useSpeciesVariantsBySpeciesQuery({
    variables: { speciesId, first: 100 },
    skip: !speciesId,
  });
  const variants = useMemo(
    () => variantsData?.speciesVariantsBySpecies?.nodes ?? [],
    [variantsData],
  );

  // Traits and their options in one query rather than one per trait.
  const { data: speciesData } = useSpeciesWithTraitsAndEnumValuesQuery({
    variables: { speciesId },
    skip: !speciesId,
  });
  const traits = useMemo(
    () => speciesData?.speciesById?.traits ?? [],
    [speciesData],
  );

  const changing = selectedVariantId !== currentVariantId;

  const { data: settingsData } = useEnumValueSettingsBySpeciesVariantQuery({
    variables: { speciesVariantId: selectedVariantId ?? "", first: 500 },
    skip: !selectedVariantId || !changing,
  });

  /**
   * Which options the target variant permits.
   *
   * Null only while the answer is not known yet — no variant picked, or the
   * settings still loading. An **empty** set is a real answer, and it means
   * the variant permits nothing; see `strandedValues`.
   */
  const allowed = useMemo(() => {
    if (!changing || !selectedVariantId || !settingsData) return null;
    return new Set(
      settingsData.enumValueSettingsBySpeciesVariant?.nodes?.map(
        (s) => s.enumValueId,
      ) ?? [],
    );
  }, [changing, selectedVariantId, settingsData]);

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

  /** Current values the target variant does not permit. */
  const stranded = useMemo(() => {
    if (!allowed) return [];
    return strandedValues(traitValues, allowed, optionsById);
  }, [allowed, traitValues, optionsById]);

  useEffect(() => {
    onUnresolvedChange(stranded.length);
  }, [stranded.length, onUnresolvedChange]);

  /** Replace one stranded value, or drop it when `to` is empty. */
  const reroute = (index: number, to: string) => {
    onTraitValuesChange(
      to
        ? traitValues.map((tv, i) => (i === index ? { ...tv, value: to } : tv))
        : traitValues.filter((_, i) => i !== index),
    );
  };

  return (
    <Wrap>
      <Label htmlFor="variant">Variant</Label>
      <Select
        id="variant"
        data-testid="variant-select"
        value={selectedVariantId ?? ""}
        disabled={disabled}
        onChange={(e) =>
          onVariantChange(variants.find((v) => v.id === e.target.value) ?? null)
        }
      >
        <option value="">No variant</option>
        {variants.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </Select>
      <Help>
        Rarity. Changing it is a staff action and is recorded against this
        character.
      </Help>

      {changing && (
        <>
          <Label htmlFor="variantChangeReason" style={{ marginTop: "1rem" }}>
            Why (optional)
          </Label>
          <Input
            id="variantChangeReason"
            data-testid="variant-change-reason"
            value={reason}
            disabled={disabled}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="e.g. upgrade ticket #204"
            maxLength={500}
          />
          <Help>Shown on this character&rsquo;s rarity history.</Help>
        </>
      )}

      {stranded.length > 0 && (
        <Reroute data-testid="variant-reroute">
          <RerouteHead>
            <AlertTriangle size={18} />
            {stranded.length === 1
              ? "One trait value does not exist at that rarity"
              : `${stranded.length} trait values do not exist at that rarity`}
          </RerouteHead>
          <Help style={{ marginBottom: "0.5rem" }}>
            Pick what each should become, or remove it. The change cannot be
            saved while any is unresolved &mdash; the server refuses it too.
          </Help>

          {stranded.map((row) => {
            const trait = traits.find((t) => t.id === row.traitId);
            const choices = (trait?.enumValues ?? []).filter((ev) =>
              allowed!.has(ev.id),
            );
            return (
              <Row key={`${row.traitId}-${row.index}`}>
                <Was>
                  {row.traitName}
                  <span>currently {row.optionName}</span>
                </Was>
                <Select
                  data-testid={`reroute-${row.traitId}`}
                  defaultValue=""
                  disabled={disabled}
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
    </Wrap>
  );
};
