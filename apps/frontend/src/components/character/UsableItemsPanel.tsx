import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Package } from "lucide-react";
import { Button } from "@chardb/ui";
import {
  useGetMyEditKitsQuery,
  useGetMyVariantChangeItemsQuery,
} from "../../generated/graphql";
import { useAuth } from "../../contexts/AuthContext";
import { kitCovers } from "../../lib/editKits";
import { variantItemUsableOn } from "../../lib/variantChangeItems";

const Section = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
`;

const Intro = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

/**
 * One item, on one line.
 *
 * A grid rather than a flex row so the icon, the text and the button land on
 * the same vertical lines on every row -- with flex the button's position
 * followed the length of the item's name.
 */
const Row = styled.li`
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};

  @media (max-width: 560px) {
    grid-template-columns: 40px minmax(0, 1fr);
    row-gap: ${({ theme }) => theme.spacing.sm};

    /* The button drops to its own full-width line rather than squeezing the
       name into two characters. */
    > *:last-child {
      grid-column: 1 / -1;
    }
  }
`;

const Swatch = styled.div<{ $hex?: string | null }>`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  flex: none;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme, $hex }) =>
    $hex ? `${$hex}22` : theme.colors.surface};
  color: ${({ theme, $hex }) => $hex || theme.colors.text.muted};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 560px) {
    width: 40px;
    height: 40px;
  }
`;

const Text = styled.div`
  min-width: 0;
`;

const Name = styled.div`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  a {
    color: inherit;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const Effect = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Count = styled.span`
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  margin-left: ${({ theme }) => theme.spacing.xs};
`;

interface Props {
  character: {
    id: string;
    name: string;
    speciesId?: string | null;
    speciesVariantId?: string | null;
    species?: { communityId?: string | null } | null;
  };
  /** Hidden entirely for anyone but the owner. */
  isOwner: boolean;
  /** A character mid-review takes no items, so the section is not offered. */
  hasPendingReview: boolean;
}

interface Offer {
  itemTypeId: string;
  name: string;
  effect: string;
  count: number;
  to: string;
  image?: {
    thumbnailUrl?: string | null;
    originalUrl?: string | null;
    altText?: string | null;
  } | null;
  hex?: string | null;
}

/**
 * The items this viewer holds that would do something to this character.
 *
 * Replaces a row of buttons whose labels were built as sentences -- "Make
 * Emberwake Legendary" beside "Use your Thornwing Edit Kit" -- which read as
 * prose rather than controls and pushed the button positions around as names
 * grew. An item is a thing you own, so it is listed like one: icon, name, what
 * redeeming it does, how many you hold, and one button per row.
 *
 * Nothing here spends anything. Every button is a link to the page that asks
 * for a confirmation.
 */
export const UsableItemsPanel: React.FC<Props> = ({
  character,
  isOwner,
  hasPendingReview,
}) => {
  const { user } = useAuth();
  const communityId = character.species?.communityId ?? "";
  const skip = !isOwner || hasPendingReview || !communityId || !user?.id;

  const { data: kitsData } = useGetMyEditKitsQuery({
    variables: { communityId, userId: user?.id ?? "" },
    skip,
  });

  const { data: variantData } = useGetMyVariantChangeItemsQuery({
    variables: { communityId, userId: user?.id ?? "" },
    skip,
  });

  const offers = useMemo<Offer[]>(() => {
    const rows: Offer[] = [];

    for (const h of kitsData?.memberHoldings?.holdings ?? []) {
      const grant = h.itemType.useTraitEditGrant;
      if (!grant || !kitCovers(grant, character)) continue;
      rows.push({
        itemTypeId: h.itemType.id,
        name: h.itemType.name,
        effect: "Propose a change to this character's traits",
        count: h.count,
        to: `/character/${character.id}/edit-traits?kitType=${h.itemType.id}`,
        image: h.itemType.image,
        hex: h.itemType.color?.hexCode,
      });
    }

    for (const h of variantData?.memberHoldings?.holdings ?? []) {
      const grant = h.itemType.useVariantChangeGrant;
      if (!grant || !variantItemUsableOn(grant, character)) continue;
      rows.push({
        itemTypeId: h.itemType.id,
        name: h.itemType.name,
        effect: `Becomes ${grant.toVariant.name}`,
        count: h.count,
        to: `/character/${character.id}/change-variant?itemType=${h.itemType.id}`,
        image: h.itemType.image,
        hex: h.itemType.color?.hexCode,
      });
    }

    return rows;
  }, [kitsData, variantData, character]);

  if (skip || offers.length === 0) return null;

  return (
    <Section data-testid="character-usable-items">
      <Title>Your Items</Title>
      <Intro>
        Items you hold that can be redeemed on {character.name}. Nothing is
        spent until you confirm.
      </Intro>
      <List>
        {offers.map((offer) => (
          <Row
            key={`${offer.itemTypeId}-${offer.to}`}
            data-testid={`usable-item-${offer.itemTypeId}`}
          >
            <Swatch $hex={offer.hex}>
              {offer.image ? (
                <img
                  src={
                    offer.image.thumbnailUrl || offer.image.originalUrl || ""
                  }
                  alt={offer.image.altText || offer.name}
                />
              ) : (
                <Package size={20} />
              )}
            </Swatch>
            <Text>
              <Name>
                <Link to={`/item-types/${offer.itemTypeId}`}>{offer.name}</Link>
                {offer.count > 1 && <Count>&times;{offer.count}</Count>}
              </Name>
              <Effect>{offer.effect}</Effect>
            </Text>
            <Button
              as={Link}
              to={offer.to}
              variant="outline"
              size="sm"
              data-testid={`redeem-${offer.itemTypeId}`}
            >
              Redeem
            </Button>
          </Row>
        ))}
      </List>
    </Section>
  );
};
