import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { usePageMeta } from "../lib/pageMeta";
import { useAuth } from "../contexts/AuthContext";
import {
  useCommunityId,
  useHostCommunity,
} from "../contexts/CommunityHostContext";
import { CharacterFolderBrowser } from "../components/character-folders/CharacterFolderBrowser";

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const Separator = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing.xl} 0;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.error};
`;

/**
 * Your characters, inside one community (#338).
 *
 * The question that prompted this was "when I go to Cloverse, where can I view
 * my Cloverse characters" -- a *where*, which a filter on the browse page
 * answers only once you are already on it. This is a destination in the
 * sidebar instead, beside Browse Characters.
 *
 * The same workspace and the same folders as `/my/characters`, counted against
 * this community alone. Folders belong to you rather than to a community, so
 * one holding nothing here still appears, reporting zero -- the rail keeps its
 * shape wherever you are, and you can file into a folder from inside a
 * community that has nothing in it yet.
 */
export const CommunityMyCharactersPage: React.FC = () => {
  usePageMeta({ title: "My Characters" });

  const { user } = useAuth();
  const communityId = useCommunityId();
  const community = useHostCommunity();

  if (!communityId || !community) {
    return (
      <ErrorContainer>
        <h3>Error</h3>
        <p>This address names no community</p>
      </ErrorContainer>
    );
  }

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
      <Breadcrumb>
        <Link to="/">{community.name}</Link>
        <Separator>›</Separator>
        <span>My Characters</span>
      </Breadcrumb>

      <Title>My {community.name} Characters</Title>
      <Subtitle>Your folders, counted against this community alone</Subtitle>

      <CharacterFolderBrowser
        ownerId={user.id}
        editable
        communityId={communityId}
      />
    </Container>
  );
};

export default CommunityMyCharactersPage;
