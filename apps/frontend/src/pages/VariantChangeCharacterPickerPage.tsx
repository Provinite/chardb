import React, { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import {
  useGetVariantChangeItemQuery,
  useGetMyCharactersForEditKitQuery,
} from "../generated/graphql";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  variantItemUsableOn,
  variantItemCovers,
  alreadyThere,
} from "../lib/variantChangeItems";

const Container = styled.div`
  max-width: 800px;
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
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.75rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
`;

const Note = styled.p`
  margin: 0 0 1.5rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.9375rem;
`;

const Row = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  margin-bottom: 0.6rem;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Meta = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

/**
 * Which of your characters to redeem this item on.
 *
 * The entry point from the inventory. Only characters the item actually moves
 * are listed — one already at the destination is left off, because offering it
 * would put the refusal after the choice.
 *
 * Nothing is spent here. This is a list of links.
 */
export const VariantChangeCharacterPickerPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: itemData, loading: itemLoading } =
    useGetVariantChangeItemQuery({
      variables: { itemId: itemId! },
      skip: !itemId,
      fetchPolicy: "network-only",
    });

  const item = itemData?.item ?? null;
  const redeemable = Boolean(
    item && !item.destroyedAt && item.ownerId === user?.id,
  );
  const grant = redeemable
    ? (item?.itemType?.useVariantChangeGrant ?? null)
    : null;

  const { data: charactersData, loading: charactersLoading } =
    useGetMyCharactersForEditKitQuery({
      variables: { filters: { limit: 100, offset: 0 } },
      skip: !grant,
    });

  const characters = useMemo(
    () => charactersData?.myCharacters?.characters ?? [],
    [charactersData],
  );

  const eligible = useMemo(() => {
    if (!grant) return [];
    return characters.filter((c) => variantItemUsableOn(grant, c));
  }, [characters, grant]);

  /**
   * Characters this covers but which are already where it would send them.
   *
   * Counted rather than listed, so a member who expected to see one of these
   * is told why it is missing instead of being left to guess.
   */
  const alreadyCount = useMemo(() => {
    if (!grant) return 0;
    return characters.filter(
      (c) => variantItemCovers(grant, c) && alreadyThere(grant, c),
    ).length;
  }, [characters, grant]);

  if (itemLoading || charactersLoading) return <LoadingSpinner />;

  if (!grant) {
    return (
      <Container>
        <BackButton type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </BackButton>
        <p data-testid="variant-change-unusable">
          That item cannot be redeemed. It may already have been spent, or it
          may not be an item that changes a character&rsquo;s variant.
        </p>
      </Container>
    );
  }

  return (
    <Container>
      <BackButton type="button" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} />
        Back
      </BackButton>

      <Title>
        <ArrowUpRight size={22} />
        Which character?
      </Title>
      <Note>
        Your <strong>{item?.itemType?.name}</strong> makes one of these{" "}
        <strong>{grant.toVariant.name}</strong>. Nothing is spent until you
        confirm.
      </Note>

      {eligible.length === 0 ? (
        <p data-testid="variant-change-no-characters">
          {alreadyCount > 0
            ? `Your ${grant.toVariant.name} characters are already there, and none of your others are ones this works on.`
            : "None of your characters are ones this works on."}
        </p>
      ) : (
        <>
          {eligible.map((c) => (
            <Row
              key={c.id}
              to={`/character/${c.id}/change-variant?item=${itemId}`}
              data-testid={`variant-change-character-${c.id}`}
            >
              <span>{c.name}</span>
              <Meta>
                {c.speciesVariant?.name ?? "No variant"} &rarr;{" "}
                {grant.toVariant.name}
              </Meta>
            </Row>
          ))}
          {alreadyCount > 0 && (
            <Note data-testid="variant-change-already-there">
              {alreadyCount === 1
                ? "One of your characters is already "
                : `${alreadyCount} of your characters are already `}
              {grant.toVariant.name}, so it is not listed.
            </Note>
          )}
        </>
      )}
    </Container>
  );
};
