import React from "react";
import { usePageMeta } from "../lib/pageMeta";
import styled from "styled-components";
import { useAuth } from "../contexts/AuthContext";
import { CharacterFolderBrowser } from "../components/character-folders/CharacterFolderBrowser";

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.error};
`;

/**
 * Everything you own, arranged the way you arranged it.
 *
 * A file browser rather than one flat grid (#350): folders at the top, the
 * characters filed here below, and the root holding whatever is in no folder
 * at all. Somebody who has never made a folder sees their whole collection
 * exactly as they did before, because at that point nothing is filed.
 *
 * The paging that #307 added lives in `CharacterFolderBrowser` now, along with
 * everything else the browser needs to keep the grid and the folder counts
 * agreeing after a drag.
 */
export const MyCharactersPage: React.FC = () => {
  usePageMeta({ title: "My Characters" });

  const { user } = useAuth();

  if (!user) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Please log in to view your characters</h3>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>My Characters</Title>
        <Subtitle>Characters you've created and own</Subtitle>
      </Header>

      <CharacterFolderBrowser ownerId={user.id} editable />
    </Container>
  );
};

export default MyCharactersPage;
