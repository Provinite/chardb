import React from "react";
import styled from "styled-components";
import { Ticket } from "lucide-react";
import type {
  SpeciesDetailsFragment,
  SpeciesVariantDetailsFragment,
} from "../../generated/graphql";

const Wrap = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.primary}40;
  background: ${({ theme }) => theme.colors.primary}0d;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: 1rem 1.15rem;
`;

const Head = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.35rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Note = styled.p`
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Label = styled.span`
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: 0.4rem;
`;

const SpeciesName = styled.p`
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Variants = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const VariantButton = styled.button<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.primary : theme.colors.surface};
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.surface : theme.colors.text.primary};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Swatch = styled.span<{ $color: string }>`
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: 1px solid rgba(0, 0, 0, 0.2);
`;

const Error = styled.p`
  margin: 0.6rem 0 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.error};
`;

interface Props {
  itemTypeName: string;
  species: SpeciesDetailsFragment;
  variants: SpeciesVariantDetailsFragment[];
  selectedVariantId?: string | null;
  onVariantChange: (variant: SpeciesVariantDetailsFragment) => void;
  error?: string;
}

/**
 * The species half of the create page when a ticket is being spent.
 *
 * Stands in for `SpeciesSelector` rather than configuring it. The selector
 * exists to answer "which of the species you may create in", and under a
 * ticket that question is already answered -- offering it disabled would
 * invite the reader to look for a way to change it.
 *
 * The variants are the ticket's, not the species'. A species with eight
 * variants and a ticket good for two must show two, or the first thing a
 * member learns about their ticket is a refusal.
 */
export const MyoTicketPanel: React.FC<Props> = ({
  itemTypeName,
  species,
  variants,
  selectedVariantId,
  onVariantChange,
  error,
}) => (
  <Wrap data-testid="myo-ticket-panel">
    <Head>
      <Ticket size={20} />
      Making a character with your {itemTypeName}
    </Head>
    <Note>
      Submitting spends it and cannot be undone. The character is yours straight
      away; its traits go to staff for review.
    </Note>

    <Label>Species</Label>
    <SpeciesName data-testid="myo-species">{species.name}</SpeciesName>

    <Label>
      {variants.length === 1
        ? "This one makes"
        : `Pick one of ${variants.length}`}
    </Label>
    <Variants>
      {variants.map((variant) => (
        <VariantButton
          key={variant.id}
          type="button"
          $selected={selectedVariantId === variant.id}
          onClick={() => onVariantChange(variant)}
          data-testid={`myo-variant-${variant.id}`}
        >
          {variant.color?.hexCode && <Swatch $color={variant.color.hexCode} />}
          {variant.name}
        </VariantButton>
      ))}
    </Variants>

    {error && <Error>{error}</Error>}
  </Wrap>
);
