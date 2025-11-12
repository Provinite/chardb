import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { CharacterGrid } from "../components/CharacterGrid";
import { useAuth } from "../contexts/AuthContext";
import { useGetMyCharactersQuery } from "../generated/graphql";

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

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  opacity: 0.5;
`;

const EmptyTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const EmptyDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
`;

const CreateButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
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

export const MyCharactersPage: React.FC = () => {
  const { user } = useAuth();

  const { data, loading, error } = useGetMyCharactersQuery({
    skip: !user,
  });

  const myCharacters = data?.myCharacters?.characters || [];

  if (!user) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Please log in to view your characters</h3>
        </ErrorContainer>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Error loading your characters</h3>
          <p>{error.message}</p>
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

      {myCharacters.length === 0 ? (
        <EmptyState>
          <EmptyIcon>🎭</EmptyIcon>
          <EmptyTitle>No characters yet</EmptyTitle>
          <EmptyDescription>
            You haven't created any characters yet. Create your first character
            to get started!
          </EmptyDescription>
          <CreateButton to="/character/create">
            Create Your First Character
          </CreateButton>
        </EmptyState>
      ) : (
        <CharacterGrid
          characters={myCharacters}
          showOwner={false}
          showEditButton={true}
        />
      )}
    </Container>
  );
};

export default MyCharactersPage;
