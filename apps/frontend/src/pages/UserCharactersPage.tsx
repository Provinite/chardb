import React from "react";
import { usePageMeta } from "../lib/pageMeta";
import { useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { CharacterFolderBrowser } from "../components/character-folders/CharacterFolderBrowser";
import { useAuth } from "../contexts/AuthContext";
import { useUserIdentityQuery } from "../generated/graphql";

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

const BackLink = styled(Link)`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xxl};
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.error};
`;

/**
 * Every character one member owns.
 *
 * The destination the profile's "View All" always claimed to have. It used to
 * point at `/characters?owner=<username>` -- a parameter the browse page does
 * not parse, carrying a username where the filter wants a UUID -- so it landed
 * on the unfiltered global browse and presented every character on the site as
 * that member's (#321, #214).
 *
 * The listing is now the owner's own folder structure (#350), which is what
 * makes folders worth having to anyone but their owner: a member with a
 * hundred characters can arrange how visitors meet them. Private folders and
 * everything under them are absent, and the server decides that -- doing it
 * here would mean shipping the names to the browser and trusting the page not
 * to draw them.
 *
 * At the root a visitor sees every character rather than only the unfiled
 * ones. The owner's root is the pile that empties as they file; a visitor's is
 * a listing, and one that quietly omitted everything already filed would be
 * the same class of lie as the dropped filter this page was built to fix.
 */
export const UserCharactersPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: viewer } = useAuth();

  usePageMeta({ title: `@${username}'s Characters` });

  const { data: identity, loading: identityLoading } = useUserIdentityQuery({
    variables: { username: username! },
    skip: !username,
  });

  const user = identity?.user;

  if (identityLoading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container>
        <ErrorContainer>
          <h3>No such member</h3>
          <p>Nobody here goes by "{username}".</p>
        </ErrorContainer>
      </Container>
    );
  }

  const displayName = user.displayName || user.username;

  return (
    <Container data-testid="user-characters-page">
      <Header>
        {/* Named rather than "Browse Characters", which is what this grid says
            when it is showing everybody. A per-owner listing that does not say
            whose it is repeats the bug it exists to fix, just more quietly. */}
        <Title>{displayName}'s Characters</Title>
        <BackLink to={`/user/${user.username}`}>
          &larr; Back to profile
        </BackLink>
      </Header>

      <CharacterFolderBrowser
        ownerId={user.id}
        editable={viewer?.id === user.id}
      />
    </Container>
  );
};

export default UserCharactersPage;
