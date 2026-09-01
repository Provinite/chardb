import React, { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { ArrowLeft, Wrench } from "lucide-react";
import {
  useGetEditKitQuery,
  useGetMyCharactersForEditKitQuery,
} from "../generated/graphql";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { kitCovers } from "../lib/editKits";

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
 * Which of your characters to spend this kit on.
 *
 * The entry point from the inventory. Only characters the kit actually covers
 * are listed — a picker offering everything and refusing most of it would put
 * the refusal after the choice.
 *
 * Nothing is spent here. This is a list of links.
 */
export const EditKitCharacterPickerPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: kitData, loading: kitLoading } = useGetEditKitQuery({
    variables: { itemId: itemId! },
    skip: !itemId,
    fetchPolicy: "network-only",
  });

  const kit = kitData?.item ?? null;
  const spendable = Boolean(
    kit && !kit.destroyedAt && kit.ownerId === user?.id,
  );
  const grant = spendable ? (kit?.itemType?.useTraitEditGrant ?? null) : null;

  const { data: charactersData, loading: charactersLoading } =
    useGetMyCharactersForEditKitQuery({
      variables: { filters: { limit: 100, offset: 0 } },
      skip: !grant,
    });

  const eligible = useMemo(() => {
    if (!grant) return [];
    return (charactersData?.myCharacters?.characters ?? []).filter((c) =>
      kitCovers(grant, c),
    );
  }, [charactersData, grant]);

  if (kitLoading || charactersLoading) return <LoadingSpinner />;

  if (!grant) {
    return (
      <Container>
        <BackButton type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </BackButton>
        <p data-testid="edit-kit-unusable">
          That kit cannot be used. It may already have been spent, or it may
          not be a kit that edits traits.
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
        <Wrench size={22} />
        Which character?
      </Title>
      <Note>
        Your <strong>{kit?.itemType?.name}</strong> can change the traits of
        these. Nothing is spent until you submit the change.
      </Note>

      {eligible.length === 0 ? (
        <p data-testid="edit-kit-no-characters">
          None of your characters are ones this kit works on.
        </p>
      ) : (
        eligible.map((c) => (
          <Row
            key={c.id}
            to={`/character/${c.id}/edit-traits?kit=${itemId}`}
            data-testid={`edit-kit-character-${c.id}`}
          >
            <span>{c.name}</span>
            <Meta>
              {c.species?.name}
              {c.speciesVariant?.name ? ` · ${c.speciesVariant.name}` : ""}
            </Meta>
          </Row>
        ))
      )}
    </Container>
  );
};
