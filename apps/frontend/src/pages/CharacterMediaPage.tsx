import React from "react";
import styled from "styled-components";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useGetCharacterQuery } from "../generated/graphql";
import { useAuth } from "../contexts/AuthContext";
import { useUserCommunityRole } from "../hooks/useUserCommunityRole";
import { canUserEditCharacter } from "../lib/characterPermissions";
import { CharacterMediaGallery } from "../components/CharacterMediaGallery";
import { LoadingSpinner } from "../components/LoadingSpinner";

/**
 * Everything one character has, rather than the first pageful.
 *
 * The character page has only room for a preview, and it has linked here for
 * as long as it has had more than a page of media -- to a route that did not
 * exist, so the link landed on Not Found. This is that page.
 *
 * It renders the same gallery component rather than a second grid of its own:
 * the filter tabs, the counts and the set-as-main controls all live there, and
 * two copies of them would drift apart.
 */

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  margin-bottom: 1.5rem;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
  text-decoration: none;
  margin-bottom: 0.75rem;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Empty = styled.div`
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 3rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const CharacterMediaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data, loading, error } = useGetCharacterQuery({
    variables: { id: id as string },
    skip: !id,
  });

  const character = data?.character;
  const { permissions } = useUserCommunityRole(
    character?.species?.community?.id,
  );

  if (!id) return null;

  // Only before there is anything to show; a bare `loading` check would blank
  // the page on every revalidation.
  if (loading && !data) {
    return (
      <Container>
        <LoadingSpinner />
      </Container>
    );
  }

  if (error || !character) {
    return (
      <Container>
        <Empty>{error?.message ?? "Character not found"}</Empty>
      </Container>
    );
  }

  return (
    <Container data-testid="character-media-page">
      <Header>
        <BackLink to={`/character/${character.id}`}>
          <ArrowLeft size={14} /> Back to {character.name}
        </BackLink>
        <Title>{character.name}&apos;s media</Title>
      </Header>

      <CharacterMediaGallery
        characterId={character.id}
        canUpload={canUserEditCharacter(character, user, permissions)}
        // A bigger batch than the character page's preview, since seeing all of
        // it is the entire reason somebody is here.
        limit={24}
        currentMainMediaId={character.mainMediaId || undefined}
        // Already here; linking here again would be a loop.
        showViewAll={false}
      />
    </Container>
  );
};

export default CharacterMediaPage;
